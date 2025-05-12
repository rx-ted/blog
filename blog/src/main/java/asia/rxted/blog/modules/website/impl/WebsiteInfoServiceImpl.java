package asia.rxted.blog.modules.website.impl;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.CollectionUtils;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.constant.CommonConstant;
import asia.rxted.blog.mapper.AboutMapper;
import asia.rxted.blog.mapper.ArticleMapper;
import asia.rxted.blog.mapper.CategoryMapper;
import asia.rxted.blog.mapper.CommentMapper;
import asia.rxted.blog.mapper.TagMapper;
import asia.rxted.blog.mapper.TalkMapper;
import asia.rxted.blog.mapper.UserInfoMapper;
import asia.rxted.blog.mapper.WebsiteConfigMapper;
import asia.rxted.blog.model.dto.ArticleRankDTO;
import asia.rxted.blog.model.dto.ArticleStatisticsDTO;
import asia.rxted.blog.model.dto.CategoryDTO;
import asia.rxted.blog.model.dto.TagDTO;
import asia.rxted.blog.model.dto.UniqueViewDTO;
import asia.rxted.blog.model.dto.WebsiteAboutDTO;
import asia.rxted.blog.model.dto.WebsiteAdminInfoDTO;
import asia.rxted.blog.model.dto.WebsiteConfigDTO;
import asia.rxted.blog.model.dto.WebsiteHomeInfoDTO;
import asia.rxted.blog.model.entity.About;
import asia.rxted.blog.model.entity.Article;
import asia.rxted.blog.model.entity.Comment;
import asia.rxted.blog.model.entity.UserInfo;
import asia.rxted.blog.model.entity.WebsiteConfig;
import asia.rxted.blog.model.vo.AboutVO;
import asia.rxted.blog.model.vo.WebsiteConfigVO;
import asia.rxted.blog.modules.cache.CachePrefix;
import asia.rxted.blog.modules.cache.service.RedisService;
import asia.rxted.blog.modules.website.UniqueViewService;
import asia.rxted.blog.modules.website.WebsiteInfoService;
import asia.rxted.blog.utils.BeanCopyUtil;
import asia.rxted.blog.utils.IpUtil;
import eu.bitwalker.useragentutils.Browser;
import eu.bitwalker.useragentutils.OperatingSystem;
import eu.bitwalker.useragentutils.UserAgent;
import jakarta.servlet.http.HttpServletRequest;
import lombok.SneakyThrows;

import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.DigestUtils;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
public class WebsiteInfoServiceImpl extends ServiceImpl<UserInfoMapper, UserInfo>
        implements WebsiteInfoService {

    @Autowired
    private WebsiteConfigMapper websiteConfigMapper;

    @Autowired
    private ArticleMapper articleMapper;

    @Autowired
    private CategoryMapper categoryMapper;

    @Autowired
    private TagMapper tagMapper;

    @Autowired
    private CommentMapper commentMapper;

    @Autowired
    private TalkMapper talkMapper;

    @Autowired
    private UserInfoMapper userInfoMapper;

    @Autowired
    private AboutMapper aboutMapper;

    @Autowired
    private RedisService redisService;

    @Autowired
    private UniqueViewService uniqueViewService;

    @Autowired
    private HttpServletRequest request;

    @Override
    public void report() {
        String ipAddress = IpUtil.getIpAddress(request);
        UserAgent userAgent = IpUtil.getUserAgent(request);
        Browser browser = userAgent.getBrowser();
        OperatingSystem operatingSystem = userAgent.getOperatingSystem();
        String uuid = ipAddress + browser.getName() + operatingSystem.getName();
        String md5 = DigestUtils.md5DigestAsHex(uuid.getBytes());
        if (!redisService.sIsMember(CachePrefix.UNIQUE_VISITOR.getPrefix(), md5)) {
            String ipSource = IpUtil.getIpSource(ipAddress);
            if (StringUtils.isNotBlank(ipSource)) {
                String ipProvince = IpUtil.getIpProvince(ipSource);
                redisService.hIncr(CachePrefix.VISITOR_AREA.getPrefix(), ipProvince, 1L);
            } else {
                redisService.hIncr(CachePrefix.VISITOR_AREA.getPrefix(), CommonConstant.UNKNOWN, 1L);
            }
            redisService.incr(CachePrefix.BLOG_VIEWS_COUNT.getPrefix(), 1);
            redisService.sAdd(CachePrefix.UNIQUE_VISITOR.getPrefix(), md5);
        }
    }

    @SneakyThrows
    @Override
    public WebsiteHomeInfoDTO getAuroraHomeInfo() {
        CompletableFuture<Long> asyncArticleCount = CompletableFuture.supplyAsync(
                () -> articleMapper.selectCount(new LambdaQueryWrapper<Article>().eq(Article::getIsDelete, 0)));
        CompletableFuture<Long> asyncCategoryCount = CompletableFuture
                .supplyAsync(() -> categoryMapper.selectCount(null));
        CompletableFuture<Long> asyncTagCount = CompletableFuture.supplyAsync(() -> tagMapper.selectCount(null));
        CompletableFuture<Long> asyncTalkCount = CompletableFuture.supplyAsync(() -> talkMapper.selectCount(null));
        CompletableFuture<WebsiteConfigDTO> asyncWebsiteConfig = CompletableFuture.supplyAsync(this::getWebsiteConfig);
        CompletableFuture<Integer> asyncViewCount = CompletableFuture.supplyAsync(() -> {
            Object count = redisService.get(CachePrefix.BLOG_VIEWS_COUNT.getPrefix());
            return Integer.parseInt(Optional.ofNullable(count).orElse(0).toString());
        });
        return WebsiteHomeInfoDTO.builder()
                .articleCount(asyncArticleCount.get())
                .categoryCount(asyncCategoryCount.get())
                .tagCount(asyncTagCount.get())
                .talkCount(asyncTalkCount.get())
                .websiteConfigDTO(asyncWebsiteConfig.get())
                .viewCount(asyncViewCount.get()).build();
    }

    @Override
    public WebsiteAdminInfoDTO getAuroraAdminInfo() {
        Object count = redisService.get(CachePrefix.BLOG_VIEWS_COUNT.getPrefix());
        Integer viewsCount = Integer.parseInt(Optional.ofNullable(count).orElse(0).toString());
        Long messageCount = commentMapper.selectCount(new LambdaQueryWrapper<Comment>().eq(Comment::getType, 2));
        Long userCount = userInfoMapper.selectCount(null);
        Long articleCount = articleMapper.selectCount(new LambdaQueryWrapper<Article>()
                .eq(Article::getIsDelete, 0));
        List<UniqueViewDTO> uniqueViews = uniqueViewService.listUniqueViews();
        List<ArticleStatisticsDTO> articleStatisticsDTOs = articleMapper.listArticleStatistics();
        List<CategoryDTO> categoryDTOs = categoryMapper.listCategories();
        List<TagDTO> tagDTOs = BeanCopyUtil.copyList(tagMapper.selectList(null), TagDTO.class);
        Map<Object, Double> articleMap = redisService.zReverseRangeWithScore(
                CachePrefix.ARTICLE_VIEWS_COUNT.getPrefix(),
                0, 4);
        WebsiteAdminInfoDTO auroraAdminInfoDTO = WebsiteAdminInfoDTO.builder()
                .articleStatisticsDTOs(articleStatisticsDTOs)
                .tagDTOs(tagDTOs)
                .viewsCount(viewsCount)
                .messageCount(messageCount)
                .userCount(userCount)
                .articleCount(articleCount)
                .categoryDTOs(categoryDTOs)
                .uniqueViewDTOs(uniqueViews)
                .build();
        if (CollectionUtils.isNotEmpty(articleMap)) {
            List<ArticleRankDTO> articleRankDTOList = listArticleRank(articleMap);
            auroraAdminInfoDTO.setArticleRankDTOs(articleRankDTOList);
        }
        return auroraAdminInfoDTO;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateWebsiteConfig(WebsiteConfigVO websiteConfigVO) {
        WebsiteConfig websiteConfig = WebsiteConfig.builder()
                .id(CommonConstant.DEFAULT_CONFIG_ID)
                .config(JSON.toJSONString(websiteConfigVO))
                .build();
        websiteConfigMapper.updateById(websiteConfig);
        redisService.del(CachePrefix.WEBSITE_CONFIG.getPrefix());
    }

    @Override
    public WebsiteConfigDTO getWebsiteConfig() {
        WebsiteConfigDTO websiteConfigDTO;
        Object websiteConfig = redisService.get(CachePrefix.WEBSITE_CONFIG.name());
        if (Objects.nonNull(websiteConfig)) {
            websiteConfigDTO = JSON.parseObject(websiteConfig.toString(), WebsiteConfigDTO.class);
        } else {
            String config = websiteConfigMapper.selectById(CommonConstant.DEFAULT_CONFIG_ID).getConfig();
            websiteConfigDTO = JSON.parseObject(config, WebsiteConfigDTO.class);
            redisService.set(CachePrefix.WEBSITE_CONFIG.getPrefix(), config);
        }
        return websiteConfigDTO;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateAbout(AboutVO aboutVO) {
        About about = About.builder()
                .id(CommonConstant.DEFAULT_ABOUT_ID)
                .content(JSON.toJSONString(aboutVO))
                .build();
        aboutMapper.updateById(about);
        redisService.del(CachePrefix.ABOUT.getPrefix());
    }

    @Override
    public WebsiteAboutDTO getAbout() {
        WebsiteAboutDTO aboutDTO;
        Object about = redisService.get(CachePrefix.ABOUT.getPrefix());
        if (Objects.nonNull(about)) {
            aboutDTO = JSON.parseObject(about.toString(), WebsiteAboutDTO.class);
        } else {
            String content = aboutMapper.selectById(CommonConstant.DEFAULT_ABOUT_ID).getContent();
            aboutDTO = JSON.parseObject(content, WebsiteAboutDTO.class);
            redisService.set(CachePrefix.ABOUT.getPrefix(), content);
        }
        return aboutDTO;
    }

    private List<ArticleRankDTO> listArticleRank(Map<Object, Double> articleMap) {
        List<Integer> articleIds = new ArrayList<>(articleMap.size());
        articleMap.forEach((key, value) -> articleIds.add((Integer) key));
        return articleMapper.selectList(new LambdaQueryWrapper<Article>()
                .select(Article::getId, Article::getArticleTitle)
                .in(Article::getId, articleIds))
                .stream().map(article -> ArticleRankDTO.builder()
                        .articleTitle(article.getArticleTitle())
                        .viewsCount(articleMap.get(article.getId()).intValue())
                        .build())
                .sorted(Comparator.comparingInt(ArticleRankDTO::getViewsCount).reversed())
                .collect(Collectors.toList());
    }

}
