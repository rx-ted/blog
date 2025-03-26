package asia.rxted.blog.modules.search.service;

import java.io.IOException;
import java.util.List;

import asia.rxted.blog.modules.search.dto.SearchDTO;

public interface SearchService {

    /*
     * 首次插入文档
     */
    void create(SearchDTO searchDTO) throws IOException;

    /*
     * 动态更新或追加数据
     */
    void index(SearchDTO searchDTO) throws IOException;

    /*
     * 清理过期数据
     */
    void delete(String id) throws IOException;

    /*
     * 获取单条记录详情
     */
    SearchDTO get(String id) throws IOException;

    /*
     * 复杂检索与数据分析
     */
    List<SearchDTO> search(String keywords) throws IOException;

}
