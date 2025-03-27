package asia.rxted.blog.consumer;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;

import com.alibaba.fastjson.JSON;

import asia.rxted.blog.model.dto.MaxWellDataDTO;
import asia.rxted.blog.model.entity.Article;
import asia.rxted.blog.modules.search.dto.SearchDTO;
import asia.rxted.blog.modules.search.dto.SearchDTO.SearchDTOBuilder;
import asia.rxted.blog.modules.search.service.SearchService;

public class MaxWellConsumer {

    @Autowired
    private SearchService searchService;

    public void process(byte[] data) throws IOException {
        MaxWellDataDTO maxWellDataDTO = JSON.parseObject(new String(data), MaxWellDataDTO.class);
        Article article = JSON.parseObject(JSON.toJSONString(maxWellDataDTO.getData()), Article.class);
        switch (maxWellDataDTO.getType()) {
            case "insert":
            case "update":
                // append or update
                SearchDTOBuilder search = SearchDTO.builder()
                        .id(Integer.toString(article.getId()))
                        .content(article.getArticleContent())
                        .title(article.getArticleTitle())
                        .isDelete(article.getIsDelete())
                        .status(article.getStatus());
                searchService.index(search.build());
                break;
            case "delete":
                searchService.delete(Integer.toString(article.getId()));
                break;

            default:
                break;
        }
    }
}
