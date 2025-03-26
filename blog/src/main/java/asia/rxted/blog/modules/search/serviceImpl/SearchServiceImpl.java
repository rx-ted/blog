package asia.rxted.blog.modules.search.serviceImpl;

import java.io.IOException;

import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.opensearch._types.FieldValue;
import org.opensearch.client.opensearch._types.OpenSearchException;
import org.opensearch.client.opensearch.core.CreateRequest;
import org.opensearch.client.opensearch.core.CreateResponse;
import org.opensearch.client.opensearch.core.DeleteRequest;
import org.opensearch.client.opensearch.core.GetRequest;
import org.opensearch.client.opensearch.core.GetResponse;
import org.opensearch.client.opensearch.core.IndexRequest;
import org.opensearch.client.opensearch.core.SearchRequest;
import org.opensearch.client.opensearch.core.SearchResponse;
import org.opensearch.client.opensearch.core.UpdateRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultUtil;
import asia.rxted.blog.modules.search.dto.SearchDTO;
import asia.rxted.blog.modules.search.service.SearchService;

@ConfigurationProperties(prefix = "opensearch")
public class SearchServiceImpl<T> extends SearchDTO implements SearchService<T> {

    @Value("${opensearch.index_name}")
    private String indexName;

    @Autowired
    OpenSearchClient client;

    /*
     * 首次插入文档
     */
    @Override
    public Object create(T t) {
        try {
            CreateRequest<T> request = new CreateRequest.Builder<T>()
                    .index(indexName)
                    .id(getId())
                    .document(t)
                    .build();
            CreateResponse response = client.create(request);
            response.forcedRefresh();
            return ResultUtil.success();
        } catch (OpenSearchException e) {
            return ResultUtil.error(ResultCode.SEARCH_CREATE_ERROR);
        } catch (IOException e) {
            return ResultUtil.error(ResultCode.IO_OPEARTOR_ERROR);
        }
    }

    @Override
    public Object index(T t) {
        try {
            IndexRequest<T> request = new IndexRequest.Builder<T>()
                    .index(indexName)
                    .id(getId())
                    .document(t)
                    .build();
            client.index(request);
            return ResultUtil.success();
        } catch (OpenSearchException e) {
            return ResultUtil.error(ResultCode.SEARCH_INDEX_ERROR);
        } catch (IOException e) {
            return ResultUtil.error(ResultCode.IO_OPEARTOR_ERROR);
        }
    }

    @Override
    public Object delete(T t) {
        try {
            DeleteRequest request = new DeleteRequest.Builder()
                    .index(indexName)
                    .id(getId())
                    .build();
            client.delete(request);
            return ResultUtil.success();
        } catch (OpenSearchException e) {
            return ResultUtil.error(ResultCode.SEARCH_DELETE_ERROR);
        } catch (IOException e) {
            return ResultUtil.error(ResultCode.IO_OPEARTOR_ERROR);
        }
    }

    @Override
    public Object get(T t) {

        try {
            GetRequest request = new GetRequest.Builder()
                    .index(indexName)
                    .id(getId())
                    .build();
            GetResponse<? extends Object> response = client.get(request, t.getClass());

            return ResultUtil.success();
        } catch (OpenSearchException e) {
            return ResultUtil.error(ResultCode.SEARCH_GET_ERROR);
        } catch (IOException e) {
            return ResultUtil.error(ResultCode.IO_OPEARTOR_ERROR);
        }

    }

    @Override
    public Object update(T t1, T t2) {

        try {
            UpdateRequest<T, T> request = new UpdateRequest.Builder<T, T>()
                    .index(indexName)
                    .id(getId())
                    .doc(t2)
                    .build();
            client.update(request, (Class<T>) t2.getClass());
            return ResultUtil.success();
        } catch (OpenSearchException e) {
            return ResultUtil.error(ResultCode.SEARCH_UPDATE_ERROR);
        } catch (IOException e) {
            return ResultUtil.error(ResultCode.IO_OPEARTOR_ERROR);
        }
    }

    @Override
    public Object search(T t, String keywords) {

        try {

            SearchRequest request = new SearchRequest.Builder()
                    .index(indexName)
                    .query(q -> q.match(m -> m.field("").fuzziness("AUTO").query(FieldValue.of(keywords))))
                    .build();

            SearchResponse<? extends Object> response = client.search(request, t.getClass());
            return ResultUtil.success();
        } catch (OpenSearchException e) {
            return ResultUtil.error(ResultCode.SEARCH_ERROR);
        } catch (IOException e) {
            return ResultUtil.error(ResultCode.IO_OPEARTOR_ERROR);
        }

    }

}
