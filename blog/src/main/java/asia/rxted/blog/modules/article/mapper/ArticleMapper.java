package asia.rxted.blog.modules.article.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import asia.rxted.blog.modules.article.dto.ArticleAdminDTO;
import asia.rxted.blog.modules.article.dto.ArticleCardDTO;
import asia.rxted.blog.modules.article.dto.ArticleDTO;
import asia.rxted.blog.modules.article.dto.ArticleStatisticsDTO;
import asia.rxted.blog.modules.article.entity.Article;
import asia.rxted.blog.modules.article.vo.ConditionVO;

@Mapper
public interface ArticleMapper extends BaseMapper<Article> {

    List<ArticleCardDTO> listArticles(@Param("current") Long current, @Param("size") Long size);

    List<ArticleCardDTO> listTopAndFeaturedArticles();

    List<ArticleCardDTO> getArticlesByCategoryId(@Param("current") Long current, @Param("size") Long size,
            @Param("categoryId") Integer categoryId);

    ArticleDTO getArticleById(@Param("articleId") Integer articleId);

    ArticleCardDTO getPreArticleById(@Param("articleId") Integer articleId);

    ArticleCardDTO getNextArticleById(@Param("articleId") Integer articleId);

    ArticleCardDTO getFirstArticle();

    ArticleCardDTO getLastArticle();

    List<ArticleCardDTO> listArticlesByTagId(@Param("current") Long current, @Param("size") Long size,
            @Param("tagId") Integer tagId);

    List<ArticleCardDTO> listArchives(@Param("current") Long current, @Param("size") Long size);

    Integer countArticleAdmins(@Param("conditionVO") ConditionVO conditionVO);

    List<ArticleAdminDTO> listArticlesAdmin(@Param("current") Long current, @Param("size") Long size,
            @Param("conditionVO") ConditionVO conditionVO);

    List<ArticleStatisticsDTO> listArticleStatistics();

}
