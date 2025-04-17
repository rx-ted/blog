package asia.rxted.blog.modules.article.service;

import java.util.List;

import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.model.dto.ArchiveDTO;
import asia.rxted.blog.model.dto.ArticleAdminDTO;
import asia.rxted.blog.model.dto.ArticleAdminViewDTO;
import asia.rxted.blog.model.dto.ArticleCardDTO;
import asia.rxted.blog.model.dto.ArticleDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.SearchDTO;
import asia.rxted.blog.model.dto.TopAndFeaturedArticlesDTO;
import asia.rxted.blog.model.entity.Article;
import asia.rxted.blog.model.vo.ArticlePasswordVO;
import asia.rxted.blog.model.vo.ArticleTopFeaturedVO;
import asia.rxted.blog.model.vo.ArticleVO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.DeleteVO;

public interface ArticleService extends IService<Article> {

    // get all
    PageResultDTO<ArticleCardDTO> listArticles();

    // get by id
    ArticleDTO getArticleById(Integer id);

    // list Top And Featured Articles
    TopAndFeaturedArticlesDTO listTopAndFeaturedArticles();

    // save
    ResultCode saveOrUpdateArticle(ArticleVO article);

    // soft delete
    ResultCode softDeleteById(DeleteVO deleteVO);

    // hard delete
    ResultCode hardDeleteById(Integer id);

    // query keywords, i.e. user, article, etc.

    List<SearchDTO> search(ConditionVO condition);

    PageResultDTO<ArticleCardDTO> listArticlesByCategoryId(Integer categoryId);

    ResultCode accessArticle(ArticlePasswordVO articlePasswordVO);

    PageResultDTO<ArticleCardDTO> listArticlesByTagId(Integer tagId);

    PageResultDTO<ArchiveDTO> listArchives();

    PageResultDTO<ArticleAdminDTO> listArticlesAdmin(ConditionVO conditionVO);

    ResultCode updateArticleTopAndFeatured(ArticleTopFeaturedVO articleTopFeaturedVO);

    ResultCode updateArticleDelete(DeleteVO deleteVO);

    ResultCode deleteArticles(List<Integer> articleIds);

    ArticleAdminViewDTO getArticleByIdAdmin(Integer articleId);

    List<String> exportArticles(List<Integer> articleIds);

}
