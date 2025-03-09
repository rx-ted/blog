package asia.rxted.blog.modules.article.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import asia.rxted.blog.modules.article.dto.Article;

@Mapper
public interface ArticleMapper extends BaseMapper<Article> {
}
