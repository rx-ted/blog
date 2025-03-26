package asia.rxted.blog.modules.search.service;

public interface SearchService<T> {

    /*
     * 首次插入文档
     */
    Object create(T t);

    /*
     * 动态更新或追加数据
     */
    Object index(T t);

    /*
     * 清理过期数据
     */
    Object delete(T t);

    /*
     * 获取单条记录详情
     */
    Object get(T t);

    /*
     * 修改用户资料字段
     */
    Object update(T t1, T t2);

    /*
     * 复杂检索与数据分析
     */
    Object search(T t, String keywords);

}
