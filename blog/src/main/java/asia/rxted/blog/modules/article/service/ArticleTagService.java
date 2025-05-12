package asia.rxted.blog.modules.article.service;

import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.model.entity.ArticleTag;

public interface ArticleTagService extends IService<ArticleTag> {
    ArticleTag checkOrSaveArticleTagByArticleIdTagId(Integer articleId, Integer tagId);

}
