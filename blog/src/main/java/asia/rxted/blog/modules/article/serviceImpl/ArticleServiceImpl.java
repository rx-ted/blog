package asia.rxted.blog.modules.article.serviceImpl;

import java.io.IOException;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;

import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.config.enums.ArticleStatusEnum;
import asia.rxted.blog.mapper.ArticleMapper;
import asia.rxted.blog.mapper.CategoryMapper;
import asia.rxted.blog.mapper.TagMapper;
import asia.rxted.blog.model.dto.ArticleCardDTO;
import asia.rxted.blog.model.dto.ArticleDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.SearchDTO;
import asia.rxted.blog.model.dto.TopAndFeaturedArticlesDTO;
import asia.rxted.blog.model.entity.Article;
import asia.rxted.blog.model.entity.Category;
import asia.rxted.blog.model.entity.Tag;
import asia.rxted.blog.model.vo.ArticleVO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.DeleteVO;
import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.config.constant.RabbitMQConstant;
import asia.rxted.blog.modules.article.service.ArticleService;
import asia.rxted.blog.modules.article.service.ArticleTagService;
import asia.rxted.blog.modules.article.service.CategoryService;
import asia.rxted.blog.modules.article.service.TagService;
import asia.rxted.blog.modules.cache.CachePrefix;
import asia.rxted.blog.modules.cache.service.RedisService;
import asia.rxted.blog.modules.strategy.context.SearchStrategyContext;
import asia.rxted.blog.modules.strategy.context.UploadStrategyContext;
import asia.rxted.blog.utils.BeanCopyUtil;
import asia.rxted.blog.utils.PageUtil;
import lombok.SneakyThrows;

@Service
public class ArticleServiceImpl extends ServiceImpl<ArticleMapper, Article> implements ArticleService {

    @Autowired
    ArticleMapper articleMapper;

    @Autowired
    RedisService redisService;

    @Autowired
    CategoryMapper categoryMapper;

    @Autowired
    TagService tagService;

    @Autowired
    CategoryService categoryService;

    @Autowired
    ArticleTagService articleTagService;

    @Autowired
    RabbitTemplate rabbitTemplate;

    @Autowired
    TagMapper tagMapper;

    @Autowired
    UploadStrategyContext uploadStrategyContext;

    @Autowired
    SearchStrategyContext searchStrategyContext;

    private LambdaQueryWrapper<Article> wrapper(Integer isDelete, Integer... codes) {
        return new LambdaQueryWrapper<Article>()
                .eq(Article::getIsDelete, isDelete)
                .in(Article::getStatus, (Object[]) codes);
    }

    @Override
    @SneakyThrows
    public PageResultDTO<ArticleCardDTO> listArticles() {
        CompletableFuture<Long> future = CompletableFuture.supplyAsync(() -> this.count(wrapper(0, 1, 2)));
        List<ArticleCardDTO> articles = articleMapper.listArticles(PageUtil.getLimitCurrent(), PageUtil.getSize());
        return new PageResultDTO<ArticleCardDTO>(articles, future.get());
    }

    private void updateArticleViewsCount(Integer id) {
        redisService.zIncr(CachePrefix.VISIT_COUNT.name(), id, 1d);
    }

    @Override
    @SneakyThrows
    public ArticleDTO getArticleById(Integer id) {
        LambdaQueryWrapper<Article> wrapper = new LambdaQueryWrapper<Article>()
                .eq(Article::getId, id);
        Article articleCheck = articleMapper.selectOne(wrapper);
        if (Objects.isNull(articleCheck)) {
            return null;
        }
        if (articleCheck.getStatus().equals(ArticleStatusEnum.SECRET.code())) {
            // 从注册登录信息获取
            Boolean isAccess = redisService.sIsMember(CachePrefix.ARTICLE_ACCESS.getPrefix("userid"), id);
            if (isAccess.equals(false)) {
                ResultVO.fail(ResultCode.ARTICLE_ACCESS_FAIL);
                return null;
            }
        }
        updateArticleViewsCount(id);
        CompletableFuture<ArticleDTO> asyncArticle = CompletableFuture
                .supplyAsync(() -> articleMapper.getArticleById(id));
        CompletableFuture<ArticleCardDTO> asyncPreArticle = CompletableFuture.supplyAsync(() -> {
            ArticleCardDTO preArticle = articleMapper.getPreArticleById(id);
            if (Objects.isNull(preArticle)) {
                preArticle = articleMapper.getLastArticle();
            }
            return preArticle;
        });
        CompletableFuture<ArticleCardDTO> asyncNextArticle = CompletableFuture.supplyAsync(() -> {
            ArticleCardDTO nextArticle = articleMapper.getNextArticleById(id);
            if (Objects.isNull(nextArticle)) {
                nextArticle = articleMapper.getFirstArticle();
            }
            return nextArticle;
        });
        ArticleDTO article = asyncArticle.get();
        if (Objects.isNull(article)) {
            return null;
        }
        Double score = redisService.zScore(CachePrefix.VISIT_COUNT.name(), id);
        if (Objects.nonNull(score)) {
            article.setViewCount(score.intValue());
        }
        article.setPreArticleCard(asyncPreArticle.get());
        article.setNextArticleCard(asyncNextArticle.get());
        return article;
    }

    @Override
    @SneakyThrows
    public TopAndFeaturedArticlesDTO listTopAndFeaturedArticles() {
        List<ArticleCardDTO> articleCardDTOs = articleMapper.listTopAndFeaturedArticles();
        if (articleCardDTOs.size() == 0) {
            return new TopAndFeaturedArticlesDTO();
        } else if (articleCardDTOs.size() > 3) {
            articleCardDTOs = articleCardDTOs.subList(0, 3);
        }
        TopAndFeaturedArticlesDTO topAndFeaturedArticlesDTO = new TopAndFeaturedArticlesDTO();
        topAndFeaturedArticlesDTO.setTopArticle(articleCardDTOs.get(0));
        articleCardDTOs.remove(0);
        topAndFeaturedArticlesDTO.setFeaturedArticles(articleCardDTOs);
        return topAndFeaturedArticlesDTO;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ResultCode saveOrUpdateArticle(ArticleVO article) {
        String categroyName = article.getCategoryName();
        List<String> tagNames = article.getTagNames();

        Category category = categoryService.checkOrSaveCategoryByName(categroyName);
        List<Tag> tags = tagService.checkOrSaveTagsByName(tagNames);
        Article newArticle = BeanCopyUtil.copyObject(article, Article.class);
        if (Objects.nonNull(category))
            newArticle.setCategoryId(category.getId());
        // 注册状态提取当前用户
        // TODO(Ben): register user
        newArticle.setUserId(1);
        if (!this.saveOrUpdate(newArticle)) {
            return ResultCode.ARTICLE_SAVE_OR_UPDATE_ERROR;
        }
        if (Objects.nonNull(tags)) {
            tags.forEach(tag -> {
                if (Objects.nonNull(tag)) {
                    articleTagService.checkOrSaveArticleTagByArticleIdTagId(newArticle.getId(), tag.getId());
                }
            });
        }
        // 传播rabbitmq 告诉操作状态
        if (newArticle.getStatus().equals(ArticleStatusEnum.PUBLIC.code())) {
            rabbitTemplate.convertAndSend(RabbitMQConstant.MAXWELL_EXCHANGE, "*",
                    new Message(JSON.toJSONBytes(newArticle.getId()), new MessageProperties()));
        }
        return ResultCode.SUCCESS;
    }

    @Override
    public ResultCode softDeleteById(DeleteVO deleteVO) {
        Article article = Article.builder().id(deleteVO.getId()).isDelete(deleteVO.getIsDelete()).build();
        return this.updateById(article) ? ResultCode.SUCCESS : ResultCode.ARTICLE_DELETE_ERROR;
    }

    @Override
    public ResultCode hardDeleteById(Integer id) {
        return this.removeById(id) ? ResultCode.SUCCESS : ResultCode.ARTICLE_DELETE_ERROR;
    }

    @Override
    @SneakyThrows(IOException.class)
    public List<SearchDTO> search(ConditionVO condition) {
        return searchStrategyContext.executeSearchStrategy(condition.getKeywords());
    }

}
