package asia.rxted.blog.modules.article.serviceImpl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.mapper.ArticleTagMapper;
import asia.rxted.blog.model.entity.ArticleTag;
import asia.rxted.blog.modules.article.service.ArticleTagService;

import org.springframework.stereotype.Service;

@Service
public class ArticleTagServiceImpl extends ServiceImpl<ArticleTagMapper, ArticleTag> implements ArticleTagService {

}
