package asia.rxted.blog.modules.article.serviceImpl;

import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.modules.article.dto.Article;
import asia.rxted.blog.modules.article.mapper.ArticleMapper;
import asia.rxted.blog.modules.article.service.ArticleServer;

@Service
public class ArticleServerImpl extends ServiceImpl<ArticleMapper, Article> implements ArticleServer {

}
