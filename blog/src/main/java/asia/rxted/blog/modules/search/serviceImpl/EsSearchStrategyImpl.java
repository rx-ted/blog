package asia.rxted.blog.modules.search.serviceImpl;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.google.common.base.Strings;

import asia.rxted.blog.model.dto.SearchDTO;
import asia.rxted.blog.modules.search.service.SearchService;
import asia.rxted.blog.modules.strategy.SearchStrategy;

@Service("esSearchStrategyImpl")
public class EsSearchStrategyImpl implements SearchStrategy {

    @Autowired
    SearchService search;

    @Autowired
    SearchService searchService;

    @Override
    public List<SearchDTO> searchArticle(String keywords) throws IOException {
        if (Strings.isNullOrEmpty(keywords)) {
            return new ArrayList<>();
        }
        return searchService.search(keywords);
    }

}
