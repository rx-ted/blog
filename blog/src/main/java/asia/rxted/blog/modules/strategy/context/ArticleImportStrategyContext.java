package asia.rxted.blog.modules.strategy.context;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import asia.rxted.blog.modules.strategy.ArticleImportStrategy;
import asia.rxted.blog.modules.strategy.config.MarkdownTypeEnum;

import java.util.Map;

@Service
public class ArticleImportStrategyContext {

    @Autowired
    private Map<String, ArticleImportStrategy> articleImportStrategyMap;

    public void importArticles(MultipartFile file, String type) {
        articleImportStrategyMap.get(MarkdownTypeEnum.getMarkdownType(type)).importArticles(file);
    }
}
