package asia.rxted.blog.modules.strategy;

import java.io.IOException;
import java.util.List;

import asia.rxted.blog.modules.search.dto.SearchDTO;

public interface SearchStrategy {

    List<SearchDTO> searchArticle(String keywords) throws IOException;

}
