package asia.rxted.blog.modules.search.serviceImpl;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.opensearch._types.OpenSearchException;
import org.opensearch.client.opensearch.core.CreateRequest;
import org.opensearch.client.opensearch.core.CreateResponse;
import org.opensearch.client.opensearch.core.DeleteRequest;
import org.opensearch.client.opensearch.core.GetRequest;
import org.opensearch.client.opensearch.core.GetResponse;
import org.opensearch.client.opensearch.core.IndexRequest;
import org.opensearch.client.opensearch.core.SearchRequest;
import org.opensearch.client.opensearch.core.SearchResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Service;

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultUtil;
import asia.rxted.blog.modules.search.dto.SearchDTO;
import asia.rxted.blog.modules.search.service.SearchService;

@ConfigurationProperties(prefix = "opensearch")
@Service
public class SearchServiceImpl implements SearchService {

    @Value("${opensearch.index_name}")
    private String indexName;

    @Autowired
    OpenSearchClient client;

    /*
     * 首次插入文档
     */
    @Override
    public void create(SearchDTO searchDTO) throws IOException {
        try {
            CreateRequest<SearchDTO> request = new CreateRequest.Builder<SearchDTO>()
                    .index(indexName)
                    .id(searchDTO.getId())
                    .document(searchDTO)
                    .build();
            CreateResponse response = client.create(request);
            response.forcedRefresh();
        } catch (OpenSearchException e) {
            ResultUtil.fail(ResultCode.SEARCH_CREATE_ERROR);
        }
    }

    @Override
    public void index(SearchDTO searchDTO) throws IOException {
        try {
            IndexRequest<SearchDTO> request = new IndexRequest.Builder<SearchDTO>()
                    .index(indexName)
                    .id(searchDTO.getId())
                    .document(searchDTO)
                    .build();
            client.index(request);
        } catch (OpenSearchException e) {
            ResultUtil.fail(ResultCode.SEARCH_INDEX_ERROR);
        }
    }

    @Override
    public void delete(String id) throws IOException {
        try {
            DeleteRequest request = new DeleteRequest.Builder()
                    .index(indexName)
                    .id(id)
                    .build();
            client.delete(request);
        } catch (OpenSearchException e) {
            ResultUtil.fail(ResultCode.SEARCH_DELETE_ERROR);
        }
    }

    @Override
    public SearchDTO get(String id) throws IOException {

        try {
            GetRequest request = new GetRequest.Builder()
                    .index(indexName)
                    .id(id)
                    .build();
            GetResponse<SearchDTO> response = client.get(request, SearchDTO.class);
            return response.source();
        } catch (OpenSearchException e) {
            ResultUtil.fail(ResultCode.SEARCH_GET_ERROR);
        }
        return null;
    }

    @Override
    public List<SearchDTO> search(String keywords) throws IOException {
        try {
            SearchRequest request = new SearchRequest.Builder()
                    .index(indexName)
                    .query(q -> q.multiMatch(m -> m.fields("title", "content").fuzziness("AUTO").query(keywords))
                    // q.match(m ->
                    // m.field("title").fuzziness("AUTO").query(FieldValue.of(keywords)))
                    )
                    .build();
            SearchResponse<SearchDTO> response = client.search(request, SearchDTO.class);
            List<SearchDTO> searchDTOs = new ArrayList<>();
            for (var hit : response.hits().hits()) {
                searchDTOs.add(hit.source());
            }
            return searchDTOs;
        } catch (OpenSearchException e) {
            ResultUtil.fail(ResultCode.SEARCH_ERROR);
        }
        return null;
    }

}
