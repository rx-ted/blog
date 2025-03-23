package asia.rxted.blog.modules.strategy.serviceImpl;

import com.baomidou.mybatisplus.core.toolkit.CollectionUtils;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;

import asia.rxted.blog.config.constant.CommonConstant;
import asia.rxted.blog.model.dto.ArticleSearchDTO;
import asia.rxted.blog.modules.strategy.SearchStrategy;
import lombok.extern.log4j.Log4j2;

import org.opensearch.data.client.orhlc.NativeSearchQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.HighlightQuery;
import org.springframework.data.elasticsearch.core.query.highlight.Highlight;
import org.springframework.data.elasticsearch.core.query.highlight.HighlightField;
import org.springframework.data.elasticsearch.core.query.highlight.HighlightFieldParameters;
import org.springframework.data.elasticsearch.core.query.highlight.HighlightFieldParameters.HighlightFieldParametersBuilder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Log4j2
@Service("esSearchStrategyImpl")
public class EsSearchStrategyImpl implements SearchStrategy {

    @Autowired
    private ElasticsearchOperations elasticsearchRestTemplate;

    @Override
    public List<ArticleSearchDTO> searchArticle(String keywords) {
        if (StringUtils.isBlank(keywords)) {
            return new ArrayList<>();
        }
        return search(keywords);
    }

    private List<ArticleSearchDTO> search(String keywords) {

        HighlightFieldParametersBuilder highlightFieldParametersBuilder = HighlightFieldParameters.builder()
                .withPreTags(CommonConstant.PRE_TAG).withPostTags(CommonConstant.POST_TAG).withFragmentSize(50);
        HighlightFieldParameters highlightFieldParameters = highlightFieldParametersBuilder.build();
        List<HighlightField> highlightFields = new ArrayList<>();
        highlightFields.add(new HighlightField("articleTitle", highlightFieldParameters));
        highlightFields.add(new HighlightField("articleContent", highlightFieldParameters));

        NativeSearchQueryBuilder nativeQueryBuilder = new NativeSearchQueryBuilder()
                .withQuery(
                        QueryBuilders.multiMatchQuery(keywords, "articleTitle", "articleContent"))
                .withHighlightQuery(new HighlightQuery(new Highlight(highlightFields),
                        ArticleSearchDTO.class))
                .withPageable(Pageable.ofSize(20));

        try {
            SearchHits<ArticleSearchDTO> search = elasticsearchRestTemplate.search(nativeQueryBuilder.build(),
                    ArticleSearchDTO.class);
            return search.getSearchHits().stream().map(hit -> {
                ArticleSearchDTO article = hit.getContent();
                List<String> titleHighLightList = hit.getHighlightFields().get("articleTitle");
                if (CollectionUtils.isNotEmpty(titleHighLightList)) {
                    article.setArticleTitle(titleHighLightList.get(0));
                }
                List<String> contentHighLightList = hit.getHighlightFields().get("articleContent");
                if (CollectionUtils.isNotEmpty(contentHighLightList)) {
                    article.setArticleContent(contentHighLightList.get(contentHighLightList.size() - 1));
                }
                return article;
            }).collect(Collectors.toList());
        } catch (Exception e) {
            log.error(e.getMessage());
        }
        return new ArrayList<>();
    }

    public ArticleSearchDTO get(String id) {
        return elasticsearchRestTemplate.get(id, ArticleSearchDTO.class);
    }

}
