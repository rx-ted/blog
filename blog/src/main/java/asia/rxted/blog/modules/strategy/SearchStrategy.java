package asia.rxted.blog.modules.strategy;


import java.util.List;

import asia.rxted.blog.modules.article.dto.ArticleSearchDTO;

public interface SearchStrategy {

    List<ArticleSearchDTO> searchArticle(String keywords);

}
