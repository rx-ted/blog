package asia.rxted.blog.modules.strategy.context;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import asia.rxted.blog.config.enums.SearchModeEnum;
import asia.rxted.blog.model.dto.ArticleSearchDTO;
import asia.rxted.blog.modules.strategy.SearchStrategy;

import java.util.List;
import java.util.Map;

@Service
public class SearchStrategyContext {

    @Value("${search.mode}")
    private String searchMode;

    @Autowired
    private Map<String, SearchStrategy> searchStrategyMap;

    public List<ArticleSearchDTO> executeSearchStrategy(String keywords) {
        return searchStrategyMap.get(SearchModeEnum.getStrategy(searchMode)).searchArticle(keywords);
    }

    public ArticleSearchDTO get(String id) {
        return searchStrategyMap.get(SearchModeEnum.getStrategy(searchMode)).get(id);

    }

}
