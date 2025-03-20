package asia.rxted.blog.modules.article.service;

import java.util.List;

import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.modules.article.dto.ArchiveDTO;
import asia.rxted.blog.modules.article.dto.ArticleAdminDTO;
import asia.rxted.blog.modules.article.dto.ArticleAdminViewDTO;
import asia.rxted.blog.modules.article.dto.ArticleCardDTO;
import asia.rxted.blog.modules.article.dto.ArticleDTO;
import asia.rxted.blog.modules.article.dto.ArticleSearchDTO;
import asia.rxted.blog.modules.article.dto.PageResultDTO;
import asia.rxted.blog.modules.article.dto.TopAndFeaturedArticlesDTO;
import asia.rxted.blog.modules.article.entity.Article;
import asia.rxted.blog.modules.article.vo.ArticlePasswordVO;
import asia.rxted.blog.modules.article.vo.ArticleTopFeaturedVO;
import asia.rxted.blog.modules.article.vo.ArticleVO;
import asia.rxted.blog.modules.article.vo.ConditionVO;
import asia.rxted.blog.modules.article.vo.DeleteVO;

public interface ArticleService extends IService<Article> {
    // Pls add your additional function.

    TopAndFeaturedArticlesDTO listTopAndFeaturedArticles();

    PageResultDTO<ArticleCardDTO> listArticles();

    PageResultDTO<ArticleCardDTO> listArticlesByCategoryId(Integer categoryId);

    ArticleDTO getArticleById(Integer articleId);

    void accessArticle(ArticlePasswordVO articlePasswordVO);

    PageResultDTO<ArticleCardDTO> listArticlesByTagId(Integer tagId);

    PageResultDTO<ArchiveDTO> listArchives();

    PageResultDTO<ArticleAdminDTO> listArticlesAdmin(ConditionVO conditionVO);

    void saveOrUpdateArticle(ArticleVO articleVO);

    void updateArticleTopAndFeatured(ArticleTopFeaturedVO articleTopFeaturedVO);

    void updateArticleDelete(DeleteVO deleteVO);

    void deleteArticles(List<Integer> articleIds);

    ArticleAdminViewDTO getArticleByIdAdmin(Integer articleId);

    List<String> exportArticles(List<Integer> articleIdList);

    List<ArticleSearchDTO> listArticlesBySearch(ConditionVO condition);

}
