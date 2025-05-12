package asia.rxted.blog.modules.strategy.context;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import asia.rxted.blog.enums.SearchModeEnum;
import asia.rxted.blog.model.dto.SearchDTO;
import asia.rxted.blog.modules.strategy.SearchStrategy;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
public class SearchStrategyContext {

    @Value("${search.mode}")
    private String searchMode;

    @Autowired
    private Map<String, SearchStrategy> searchStrategyMap;

    public List<SearchDTO> executeSearchStrategy(String keywords) throws IOException {
        return searchStrategyMap.get(SearchModeEnum.getStrategy(searchMode)).searchArticle(keywords);
    }

}
