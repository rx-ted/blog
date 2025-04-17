package asia.rxted.blog.modules.article.serviceImpl;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

import asia.rxted.blog.constant.RabbitMQConstant;
import asia.rxted.blog.enums.ArticleStatusEnum;
import asia.rxted.blog.mapper.ArticleMapper;
import asia.rxted.blog.mapper.ArticleTagMapper;
import asia.rxted.blog.mapper.CategoryMapper;
import asia.rxted.blog.mapper.TagMapper;
import asia.rxted.blog.model.dto.ArchiveDTO;
import asia.rxted.blog.model.dto.ArticleAdminDTO;
import asia.rxted.blog.model.dto.ArticleAdminViewDTO;
import asia.rxted.blog.model.dto.ArticleCardDTO;
import asia.rxted.blog.model.dto.ArticleDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.SearchDTO;
import asia.rxted.blog.model.dto.TopAndFeaturedArticlesDTO;
import asia.rxted.blog.model.entity.Article;
import asia.rxted.blog.model.entity.ArticleTag;
import asia.rxted.blog.model.entity.Category;
import asia.rxted.blog.model.entity.Tag;
import asia.rxted.blog.model.vo.ArticlePasswordVO;
import asia.rxted.blog.model.vo.ArticleTopFeaturedVO;
import asia.rxted.blog.model.vo.ArticleVO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.DeleteVO;
import asia.rxted.blog.config.BizException;
import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.modules.article.service.ArticleService;
import asia.rxted.blog.modules.article.service.ArticleTagService;
import asia.rxted.blog.modules.article.service.CategoryService;
import asia.rxted.blog.modules.article.service.TagService;
import asia.rxted.blog.modules.cache.CachePrefix;
import asia.rxted.blog.modules.cache.service.RedisService;
import asia.rxted.blog.modules.strategy.context.SearchStrategyContext;
import asia.rxted.blog.utils.BeanCopyUtil;
import asia.rxted.blog.utils.PageUtil;
import asia.rxted.blog.utils.UserUtil;
import lombok.SneakyThrows;

@Service
public class ArticleServiceImpl extends ServiceImpl<ArticleMapper, Article> implements ArticleService {

    @Autowired
    private ArticleMapper articleMapper;

    @Autowired
    private ArticleTagMapper articleTagMapper;

    @Autowired
    private RedisService redisService;

    @Autowired
    private CategoryMapper categoryMapper;

    @Autowired
    private TagService tagService;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private ArticleTagService articleTagService;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private TagMapper tagMapper;

    @Autowired
    private SearchStrategyContext searchStrategyContext;

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
                throw new BizException(ResultCode.ARTICLE_ACCESS_FAIL);
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
        newArticle.setUserId(UserUtil.getUserDetailsDTO().getUserInfoId());
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
            rabbitTemplate.convertAndSend(RabbitMQConstant.SUBSCRIBE_EXCHANGE,
                    RabbitMQConstant.SUBSCRIBE_ROUTING_KEY_NAME,
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

    @Override
    @SneakyThrows
    public PageResultDTO<ArticleCardDTO> listArticlesByCategoryId(Integer categoryId) {
        LambdaQueryWrapper<Article> queryWrapper = new LambdaQueryWrapper<Article>().eq(Article::getCategoryId,
                categoryId);
        CompletableFuture<Long> asyncCount = CompletableFuture
                .supplyAsync(() -> articleMapper.selectCount(queryWrapper));
        List<ArticleCardDTO> articles = articleMapper.getArticlesByCategoryId(PageUtil.getLimitCurrent(),
                PageUtil.getSize(), categoryId);
        return new PageResultDTO<>(articles, asyncCount.get());
    }

    @Override
    @SneakyThrows
    public ResultCode accessArticle(ArticlePasswordVO articlePasswordVO) {

        Article article = articleMapper
                .selectOne(new LambdaQueryWrapper<Article>().eq(Article::getId, articlePasswordVO.getArticleId()));
        if (Objects.isNull(article)) {
            return ResultCode.ARTICLE_NOT_EXIST;
        }
        if (article.getPassword().equals(articlePasswordVO.getArticlePassword())) {
            redisService.sAdd(CachePrefix.ARTICLE_ACCESS.join(UserUtil.getUserDetailsDTO().getId().toString()),
                    articlePasswordVO.getArticleId());
            return ResultCode.SUCCESS;
        } else {
            return ResultCode.PASSWORD_ERROR;
        }
    }

    @Override
    @SneakyThrows
    public PageResultDTO<ArticleCardDTO> listArticlesByTagId(Integer tagId) {
        LambdaQueryWrapper<ArticleTag> queryWrapper = new LambdaQueryWrapper<ArticleTag>().eq(ArticleTag::getTagId,
                tagId);
        CompletableFuture<Long> asyncCount = CompletableFuture
                .supplyAsync(() -> articleTagMapper.selectCount(queryWrapper));
        List<ArticleCardDTO> articles = articleMapper.listArticlesByTagId(PageUtil.getLimitCurrent(),
                PageUtil.getSize(), tagId);
        return new PageResultDTO<>(articles, asyncCount.get());
    }

    @SneakyThrows
    @Override
    public PageResultDTO<ArchiveDTO> listArchives() {
        LambdaQueryWrapper<Article> queryWrapper = new LambdaQueryWrapper<Article>().eq(Article::getIsDelete, 0)
                .eq(Article::getStatus, 1);
        CompletableFuture<Long> asyncCount = CompletableFuture
                .supplyAsync(() -> articleMapper.selectCount(queryWrapper));
        List<ArticleCardDTO> articles = articleMapper.listArchives(PageUtil.getLimitCurrent(), PageUtil.getSize());
        HashMap<String, List<ArticleCardDTO>> map = new HashMap<>();
        for (ArticleCardDTO article : articles) {
            LocalDateTime createTime = article.getCreateTime();
            int month = createTime.getMonth().getValue();
            int year = createTime.getYear();
            String key = year + "-" + month;
            if (Objects.isNull(map.get(key))) {
                List<ArticleCardDTO> articleCardDTOS = new ArrayList<>();
                articleCardDTOS.add(article);
                map.put(key, articleCardDTOS);
            } else {
                map.get(key).add(article);
            }
        }
        List<ArchiveDTO> archiveDTOs = new ArrayList<>();
        map.forEach((key, value) -> archiveDTOs.add(ArchiveDTO.builder().Time(key).articles(value).build()));
        archiveDTOs.sort((o1, o2) -> {
            String[] o1s = o1.getTime().split("-");
            String[] o2s = o2.getTime().split("-");
            int o1Year = Integer.parseInt(o1s[0]);
            int o1Month = Integer.parseInt(o1s[1]);
            int o2Year = Integer.parseInt(o2s[0]);
            int o2Month = Integer.parseInt(o2s[1]);
            if (o1Year > o2Year) {
                return -1;
            } else if (o1Year < o2Year) {
                return 1;
            } else
                return Integer.compare(o2Month, o1Month);
        });
        return new PageResultDTO<>(archiveDTOs, asyncCount.get());

    }

    @SneakyThrows
    @Override
    public PageResultDTO<ArticleAdminDTO> listArticlesAdmin(ConditionVO conditionVO) {
        CompletableFuture<Integer> asyncCount = CompletableFuture
                .supplyAsync(() -> articleMapper.countArticleAdmins(conditionVO));
        List<ArticleAdminDTO> articleAdminDTOs = articleMapper.listArticlesAdmin(PageUtil.getLimitCurrent(),
                PageUtil.getSize(), conditionVO);
        Map<Object, Double> viewsCountMap = redisService.zAllScore(CachePrefix.ARTICLE_VIEWS_COUNT.name());
        articleAdminDTOs.forEach(item -> {
            Double viewsCount = viewsCountMap.get(item.getId());
            if (Objects.nonNull(viewsCount)) {
                item.setViewsCount(viewsCount.intValue());
            }
        });
        return new PageResultDTO<>(articleAdminDTOs, Long.valueOf(asyncCount.get()));
    }

    @Override
    public ResultCode updateArticleTopAndFeatured(ArticleTopFeaturedVO articleTopFeaturedVO) {
        Article article = Article.builder()
                .id(articleTopFeaturedVO.getId())
                .isTop(articleTopFeaturedVO.getIsTop())
                .isFeatured(articleTopFeaturedVO.getIsFeatured())
                .build();
        return articleMapper.updateById(article) > 0 ? ResultCode.SUCCESS : ResultCode.ARTICLE_SAVE_OR_UPDATE_ERROR;

    }

    @Override
    public ResultCode updateArticleDelete(DeleteVO deleteVO) {
        Article article = Article.builder().id(deleteVO.getId())
                .isDelete(deleteVO.getIsDelete())
                .build();
        return this.updateById(article) ? ResultCode.SUCCESS : ResultCode.ARTICLE_SAVE_OR_UPDATE_ERROR;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ResultCode deleteArticles(List<Integer> articleIds) {
        articleTagMapper.delete(new LambdaQueryWrapper<ArticleTag>()
                .in(ArticleTag::getArticleId, articleIds));
        return articleMapper.deleteByIds(articleIds) > 0 ? ResultCode.SUCCESS
                : ResultCode.ARTICLE_DELETE_ERROR;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ArticleAdminViewDTO getArticleByIdAdmin(Integer articleId) {
        Article article = articleMapper.selectById(articleId);
        Category category = categoryMapper.selectById(article.getCategoryId());
        String categoryName = null;
        if (Objects.nonNull(category)) {
            categoryName = category.getCategoryName();
        }
        List<String> tagNames = tagMapper.listTagNamesByArticleId(articleId);
        ArticleAdminViewDTO articleAdminViewDTO = BeanCopyUtil.copyObject(article, ArticleAdminViewDTO.class);
        articleAdminViewDTO.setCategoryName(categoryName);
        articleAdminViewDTO.setTagNames(tagNames);
        return articleAdminViewDTO;

    }

    @Override
    public List<String> exportArticles(List<Integer> articleIds) {
        /*
         * List<Article> articles = articleMapper.selectList(new
         * LambdaQueryWrapper<Article>()
         * .select(Article::getArticleTitle, Article::getArticleContent)
         * .in(Article::getId, articleIds));
         * List<String> urls = new ArrayList<>();
         * for (Article article : articles) {
         * try (ByteArrayInputStream inputStream = new
         * ByteArrayInputStream(article.getArticleContent().getBytes())) {
         * String url = uploadStrategyContext.executeUploadStrategy(
         * article.getArticleTitle() + FileExtEnum.MD.getExtName(), inputStream,
         * FilePathEnum.MD.getPath());
         * urls.add(url);
         * } catch (Exception e) {
         * e.printStackTrace();
         * throw new BizException("导出文章失败");
         * }
         * }
         * return urls;
         */
        return new ArrayList<>();
    }

}
