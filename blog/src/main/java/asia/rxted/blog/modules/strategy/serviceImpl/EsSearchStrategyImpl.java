package asia.rxted.blog.modules.strategy.serviceImpl;

import com.baomidou.mybatisplus.core.toolkit.CollectionUtils;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;

import asia.rxted.blog.config.constant.CommonConstant;
import asia.rxted.blog.config.enums.ArticleStatusEnum;
import asia.rxted.blog.model.dto.ArticleSearchDTO;
import asia.rxted.blog.modules.strategy.SearchStrategy;
import lombok.extern.log4j.Log4j2;

import org.elasticsearch.index.query.BoolQueryBuilder;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.search.fetch.subphase.highlight.HighlightBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.elasticsearch.client.erhlc.ElasticsearchRestTemplate;
import org.springframework.data.elasticsearch.client.erhlc.NativeSearchQueryBuilder;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Log4j2
@Service("esSearchStrategyImpl")
public class EsSearchStrategyImpl implements SearchStrategy {

    @Autowired
    private ElasticsearchRestTemplate elasticsearchRestTemplate;

    @Override
    public List<ArticleSearchDTO> searchArticle(String keywords) {
        if (StringUtils.isBlank(keywords)) {
            return new ArrayList<>();
        }
        return search(buildQuery(keywords));
    }

    private NativeSearchQueryBuilder buildQuery(String keywords) {
        NativeSearchQueryBuilder nativeSearchQueryBuilder = new NativeSearchQueryBuilder();
        BoolQueryBuilder boolQueryBuilder = QueryBuilders.boolQuery();
        boolQueryBuilder.must(QueryBuilders.boolQuery().should(QueryBuilders.matchQuery("articleTitle", keywords))
                .should(QueryBuilders.matchQuery("articleContent", keywords)))
                .must(QueryBuilders.termQuery("isDelete", CommonConstant.FALSE))
                .must(QueryBuilders.termQuery("status", ArticleStatusEnum.PUBLIC.getStatus()));
        nativeSearchQueryBuilder.withQuery(boolQueryBuilder);
        return nativeSearchQueryBuilder;
    }

    private List<ArticleSearchDTO> search(NativeSearchQueryBuilder nativeSearchQueryBuilder) {
        HighlightBuilder.Field titleField = new HighlightBuilder.Field("articleTitle");
        titleField.preTags(CommonConstant.PRE_TAG);
        titleField.postTags(CommonConstant.POST_TAG);
        HighlightBuilder.Field contentField = new HighlightBuilder.Field("articleContent");
        contentField.preTags(CommonConstant.PRE_TAG);
        contentField.postTags(CommonConstant.POST_TAG);
        contentField.fragmentSize(50);
        nativeSearchQueryBuilder.withHighlightFields(titleField, contentField);
        try {
            SearchHits<ArticleSearchDTO> search = elasticsearchRestTemplate.search(nativeSearchQueryBuilder.build(),
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
