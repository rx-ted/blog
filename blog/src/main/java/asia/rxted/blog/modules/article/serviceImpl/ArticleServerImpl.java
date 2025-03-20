package asia.rxted.blog.modules.article.serviceImpl;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.CollectionUtils;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.common.ResultCode;
import asia.rxted.blog.common.ResultUtil;
import asia.rxted.blog.common.enums.FileExtEnum;
import asia.rxted.blog.common.enums.FilePathEnum;
import asia.rxted.blog.modules.article.config.UserUtil;
import asia.rxted.blog.modules.article.dto.ArchiveDTO;
import asia.rxted.blog.modules.article.dto.ArticleAdminDTO;
import asia.rxted.blog.modules.article.dto.ArticleAdminViewDTO;
import asia.rxted.blog.modules.article.dto.ArticleCardDTO;
import asia.rxted.blog.modules.article.dto.ArticleDTO;
import asia.rxted.blog.modules.article.dto.ArticleSearchDTO;
import asia.rxted.blog.modules.article.dto.PageResultDTO;
import asia.rxted.blog.modules.article.dto.TopAndFeaturedArticlesDTO;
import asia.rxted.blog.modules.article.entity.Article;
import asia.rxted.blog.modules.article.entity.ArticleTag;
import asia.rxted.blog.modules.article.entity.Category;
import asia.rxted.blog.modules.article.entity.Tag;
import asia.rxted.blog.modules.article.mapper.ArticleMapper;
import asia.rxted.blog.modules.article.mapper.ArticleTagMapper;
import asia.rxted.blog.modules.article.mapper.CategoryMapper;
import asia.rxted.blog.modules.article.mapper.TagMapper;
import asia.rxted.blog.modules.article.service.ArticleService;
import asia.rxted.blog.modules.article.service.ArticleTagService;
import asia.rxted.blog.modules.article.service.TagService;
import asia.rxted.blog.modules.article.vo.ArticlePasswordVO;
import asia.rxted.blog.modules.article.vo.ArticleTopFeaturedVO;
import asia.rxted.blog.modules.article.vo.ArticleVO;
import asia.rxted.blog.modules.article.vo.ConditionVO;
import asia.rxted.blog.modules.article.vo.DeleteVO;
import asia.rxted.blog.modules.cache.CachePrefix;
import asia.rxted.blog.modules.cache.service.RedisService;
import asia.rxted.blog.modules.strategy.context.SearchStrategyContext;
import asia.rxted.blog.modules.strategy.context.UploadStrategyContext;
import asia.rxted.blog.utils.BeanCopyUtil;
import asia.rxted.blog.utils.PageUtil;
import lombok.SneakyThrows;

import static asia.rxted.blog.modules.article.config.ArticleStatusEnum.*;

@Service
public class ArticleServerImpl extends ServiceImpl<ArticleMapper, Article> implements ArticleService {
    @Autowired
    ArticleMapper articleMapper;

    @Autowired
    RedisService redisService;

    @Autowired
    ArticleTagMapper articleTagMapper;

    @Autowired
    CategoryMapper categoryMapper;

    @Autowired
    TagService tagService;

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

    @Override
    @SneakyThrows
    public PageResultDTO<ArticleCardDTO> listArticles() {
        LambdaQueryWrapper<Article> wrapper = new LambdaQueryWrapper<Article>()
                .eq(Article::getIsDelete, 0)
                .in(Article::getStatus, 1, 2);
        CompletableFuture<Long> asyncCount = CompletableFuture.supplyAsync(() -> articleMapper.selectCount(wrapper));
        List<ArticleCardDTO> articles = articleMapper.listArticles(PageUtil.getLimitCurrent(), PageUtil.getSize());
        return new PageResultDTO<ArticleCardDTO>(articles, Math.toIntExact(asyncCount.get()));
    }

    @Override
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
    @SneakyThrows
    public PageResultDTO<ArticleCardDTO> listArticlesByCategoryId(Integer categoryId) {
        LambdaQueryWrapper<Article> queryWrapper = new LambdaQueryWrapper<Article>().eq(Article::getCategoryId,
                categoryId);
        CompletableFuture<Long> asyncCount = CompletableFuture
                .supplyAsync(() -> articleMapper.selectCount(queryWrapper));
        List<ArticleCardDTO> articles = articleMapper.getArticlesByCategoryId(PageUtil.getLimitCurrent(),
                PageUtil.getSize(), categoryId);
        return new PageResultDTO<>(articles, Math.toIntExact(asyncCount.get()));

    }

    public void updateArticleViewsCount(Integer articleId) {
        redisService.zIncr(CachePrefix.ARTICLE_VIEWS_COUNT.name(), articleId, 1D);
    }

    @Override
    @SneakyThrows
    public ArticleDTO getArticleById(Integer articleId) {
        Article articleForCheck = articleMapper
                .selectOne(new LambdaQueryWrapper<Article>().eq(Article::getId, articleId));
        if (Objects.isNull(articleForCheck)) {
            return null;
        }
        if (articleForCheck.getStatus().equals(2)) {
            Boolean isAccess = false;
            try {

                isAccess = redisService.sIsMember(
                        CachePrefix.ARTICLE_ACCESS.getPrefix("_", UserUtil.getUserDetailsDTO().getId()), articleId);
            } catch (Exception exception) {
                ResultUtil.fail(ResultCode.ARTICLE_ACCESS_FAIL);
            }
            if (isAccess.equals(false)) {
                ResultUtil.fail(ResultCode.ARTICLE_ACCESS_FAIL);
            }
        }
        updateArticleViewsCount(articleId);
        CompletableFuture<ArticleDTO> asyncArticle = CompletableFuture
                .supplyAsync(() -> articleMapper.getArticleById(articleId));
        CompletableFuture<ArticleCardDTO> asyncPreArticle = CompletableFuture.supplyAsync(() -> {
            ArticleCardDTO preArticle = articleMapper.getPreArticleById(articleId);
            if (Objects.isNull(preArticle)) {
                preArticle = articleMapper.getLastArticle();
            }
            return preArticle;
        });
        CompletableFuture<ArticleCardDTO> asyncNextArticle = CompletableFuture.supplyAsync(() -> {
            ArticleCardDTO nextArticle = articleMapper.getNextArticleById(articleId);
            if (Objects.isNull(nextArticle)) {
                nextArticle = articleMapper.getFirstArticle();
            }
            return nextArticle;
        });
        ArticleDTO article = asyncArticle.get();
        if (Objects.isNull(article)) {
            return null;
        }
        Double score = redisService.zScore(CachePrefix.ARTICLE_VIEWS_COUNT.name(), articleId);
        if (Objects.nonNull(score)) {
            article.setViewCount(score.intValue());
        }
        article.setPreArticleCard(asyncPreArticle.get());
        article.setNextArticleCard(asyncNextArticle.get());
        return article;
    }

    @Override
    public void accessArticle(ArticlePasswordVO articlePasswordVO) {
        Article article = articleMapper
                .selectOne(new LambdaQueryWrapper<Article>().eq(Article::getId, articlePasswordVO.getArticleId()));
        if (Objects.isNull(article)) {
            ResultUtil.fail(ResultCode.ARTICLE_NOT_EXIST);
        }
        if (article.getPassword().equals(articlePasswordVO.getArticlePassword())) {
            redisService.sAdd(CachePrefix.ARTICLE_ACCESS.getPrefix() + UserUtil.getUserDetailsDTO().getId(),
                    articlePasswordVO.getArticleId());
        } else {
            ResultUtil.fail(ResultCode.PASSWORD_ERROR);
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
        return new PageResultDTO<>(articles, Math.toIntExact(asyncCount.get()));
    }

    @Override
    @SneakyThrows
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
        return new PageResultDTO<>(archiveDTOs, Math.toIntExact(asyncCount.get()));
    }

    @Override
    @SneakyThrows
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
        return new PageResultDTO<>(articleAdminDTOs, asyncCount.get());
    }

    private Category saveArticleCategory(ArticleVO articleVO) {
        Category category = categoryMapper.selectOne(new LambdaQueryWrapper<Category>()
                .eq(Category::getCategoryName, articleVO.getCategoryName()));
        if (Objects.isNull(category) && !articleVO.getStatus().equals(DRAFT.getStatus())) {
            category = Category.builder()
                    .categoryName(articleVO.getCategoryName())
                    .build();
            categoryMapper.insert(category);
        }
        return category;
    }

    @Transactional(rollbackFor = Exception.class)
    public void saveArticleTag(ArticleVO articleVO, Integer articleId) {
        if (Objects.nonNull(articleVO.getId())) {
            articleTagMapper.delete(new LambdaQueryWrapper<ArticleTag>()
                    .eq(ArticleTag::getArticleId, articleVO.getId()));
        }
        List<String> tagNames = articleVO.getTagNames();
        if (CollectionUtils.isNotEmpty(tagNames)) {
            List<Tag> existTags = tagService.list(new LambdaQueryWrapper<Tag>()
                    .in(Tag::getTagName, tagNames));
            List<String> existTagNames = existTags.stream()
                    .map(Tag::getTagName)
                    .collect(Collectors.toList());
            List<Integer> existTagIds = existTags.stream()
                    .map(Tag::getId)
                    .collect(Collectors.toList());
            tagNames.removeAll(existTagNames);
            if (CollectionUtils.isNotEmpty(tagNames)) {
                List<Tag> tags = tagNames.stream().map(item -> Tag.builder()
                        .tagName(item)
                        .build())
                        .collect(Collectors.toList());
                tagService.saveBatch(tags);
                List<Integer> tagIds = tags.stream()
                        .map(Tag::getId)
                        .collect(Collectors.toList());
                existTagIds.addAll(tagIds);
            }
            List<ArticleTag> articleTags = existTagIds.stream().map(item -> ArticleTag.builder()
                    .articleId(articleId)
                    .tagId(item)
                    .build())
                    .collect(Collectors.toList());
            articleTagService.saveBatch(articleTags);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveOrUpdateArticle(ArticleVO articleVO) {
        Category category = saveArticleCategory(articleVO);
        Article article = BeanCopyUtil.copyObject(articleVO, Article.class);
        if (Objects.nonNull(category)) {
            article.setCategoryId(category.getId());
        }
        article.setUserId(UserUtil.getUserDetailsDTO().getUserInfoId());
        this.saveOrUpdate(article);
        saveArticleTag(articleVO, article.getId());
        if (article.getStatus().equals(1)) {
            rabbitTemplate.convertAndSend(CachePrefix.SUBSCRIBE_EXCHANGE.name(), "*",
                    new Message(JSON.toJSONBytes(article.getId()), new MessageProperties()));
        }
    }

    @Override
    public void updateArticleTopAndFeatured(ArticleTopFeaturedVO articleTopFeaturedVO) {
        Article article = Article.builder()
                .id(articleTopFeaturedVO.getId())
                .isTop(articleTopFeaturedVO.getIsTop())
                .isFeatured(articleTopFeaturedVO.getIsFeatured())
                .build();
        articleMapper.updateById(article);
    }

    @Override
    public void updateArticleDelete(DeleteVO deleteVO) {
        List<Article> articles = deleteVO.getIds().stream()
                .map(id -> Article.builder()
                        .id(id)
                        .isDelete(deleteVO.getIsDelete())
                        .build())
                .collect(Collectors.toList());
        this.updateBatchById(articles);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteArticles(List<Integer> articleIds) {
        articleTagMapper.delete(new LambdaQueryWrapper<ArticleTag>()
                .in(ArticleTag::getArticleId, articleIds));
        articleMapper.deleteBatchIds(articleIds);
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
    public List<String> exportArticles(List<Integer> articleIdList) {
        List<Article> articles = articleMapper.selectList(new LambdaQueryWrapper<Article>()
                .select(Article::getArticleTitle, Article::getArticleContent)
                .in(Article::getId, articleIdList));
        List<String> urls = new ArrayList<>();
        for (Article article : articles) {
            try (ByteArrayInputStream inputStream = new ByteArrayInputStream(article.getArticleContent().getBytes())) {
                String url = uploadStrategyContext.executeUploadStrategy(
                        article.getArticleTitle() + FileExtEnum.MD.getExtName(), inputStream,
                        FilePathEnum.MD.getPath());
                urls.add(url);
            } catch (Exception e) {
                e.printStackTrace();
                ResultUtil.fail(ResultCode.ARTICLE_EXPORT_FAILED_ERROR);
            }
        }
        return urls;
    }

    @Override
    public List<ArticleSearchDTO> listArticlesBySearch(ConditionVO condition) {
        return searchStrategyContext.executeSearchStrategy(condition.getKeywords());

    }

}
