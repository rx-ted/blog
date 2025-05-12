package asia.rxted.blog.modules.article.serviceImpl;

import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.mapper.ArticleTagMapper;
import asia.rxted.blog.model.entity.ArticleTag;
import asia.rxted.blog.modules.article.service.ArticleTagService;

@Service
public class ArticleTagServiceImpl extends ServiceImpl<ArticleTagMapper, ArticleTag> implements ArticleTagService {

    @Override
    public ArticleTag checkOrSaveArticleTagByArticleIdTagId(Integer articleId, Integer tagId) {
        LambdaQueryWrapper<ArticleTag> wrapper = new LambdaQueryWrapper<ArticleTag>()
                .eq(ArticleTag::getArticleId, articleId).eq(ArticleTag::getTagId, tagId);
        return this.getOne(wrapper);
    }

}
