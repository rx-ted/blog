package asia.rxted.blog.modules.strategy.serviceImpl;

import com.baomidou.mybatisplus.core.toolkit.CollectionUtils;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;

import asia.rxted.blog.config.constant.CommonConstant;
import asia.rxted.blog.model.dto.ArticleSearchDTO;
import asia.rxted.blog.modules.strategy.SearchStrategy;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import lombok.extern.log4j.Log4j2;

import org.elasticsearch.common.unit.Fuzziness;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.client.elc.NativeQueryBuilder;
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

    private boolean isPhrase(String text) {
        return text.contains(" ");
    }

    private Query buildSearchSimpleQuery(String field, String text) {
        if (isPhrase(text)) {
            return BoolQuery.of(
                    q -> q.must(
                            mb -> mb.bool(
                                    b -> b.must(
                                            sb -> sb.matchPhrase(
                                                    m -> m.field(field).query(text))))))
                    ._toQuery();
        } else {
            return BoolQuery.of(
                    q -> q.must(
                            mb -> mb.bool(
                                    b -> b.must(
                                            sb -> sb.match(
                                                    m -> m.field(field).fuzziness(Fuzziness.ONE.asString())
                                                            .query(text))))))
                    ._toQuery();

        }
    }

    private List<ArticleSearchDTO> search(String keywords) {

        HighlightFieldParametersBuilder highlightFieldParametersBuilder = HighlightFieldParameters.builder()
                .withPreTags(CommonConstant.PRE_TAG).withPostTags(CommonConstant.POST_TAG).withFragmentSize(50);
        HighlightFieldParameters highlightFieldParameters = highlightFieldParametersBuilder.build();
        List<HighlightField> highlightFields = new ArrayList<>();
        highlightFields.add(new HighlightField("articleTitle", highlightFieldParameters));
        highlightFields.add(new HighlightField("articleContent", highlightFieldParameters));

        NativeQueryBuilder nativeQueryBuilder = new NativeQueryBuilder()
                .withQuery(buildSearchSimpleQuery("articleTitle", keywords))
                .withQuery(buildSearchSimpleQuery("articleContent", keywords))
                .withHighlightQuery(new HighlightQuery(new Highlight(highlightFields), ArticleSearchDTO.class))
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

}
