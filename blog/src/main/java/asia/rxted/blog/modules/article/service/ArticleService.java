package asia.rxted.blog.modules.article.service;

import java.util.List;

import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.model.dto.ArticleCardDTO;
import asia.rxted.blog.model.dto.ArticleDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.TopAndFeaturedArticlesDTO;
import asia.rxted.blog.model.entity.Article;
import asia.rxted.blog.model.vo.ArticleVO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.DeleteVO;
import asia.rxted.blog.modules.search.dto.SearchDTO;

public interface ArticleService extends IService<Article> {

    // get all
    PageResultDTO<ArticleCardDTO> listArticles();

    // get by id
    ArticleDTO getArticleById(Integer id);

    // list Top And Featured Articles
    TopAndFeaturedArticlesDTO listTopAndFeaturedArticles();

    // save
    Boolean saveOrUpdateArticle(ArticleVO article);

    Boolean softDeleteById(DeleteVO deleteVO);
    // soft delete

    // hard delete
    Boolean hardDeleteById(Integer id);

    // query keywords, i.e. user, article, etc.

    List<SearchDTO> search(ConditionVO condition);

}
