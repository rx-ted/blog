package asia.rxted.blog.controller;

import java.util.List;

import javax.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import asia.rxted.blog.common.ResultCode;
import asia.rxted.blog.common.ResultMessage;
import asia.rxted.blog.common.ResultUtil;
import asia.rxted.blog.modules.article.dto.Article;
import asia.rxted.blog.modules.article.mapper.ArticleMapper;
import io.swagger.v3.oas.annotations.Operation;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;

@RestController()
@RequestMapping("articles")

public class ArticleController {
    @Autowired
    private ArticleMapper articleMapper;

    @Operation(summary = "get all articles")
    @GetMapping()
    public ResultMessage<List<Article>> getArticles() {
        try {
            List<Article> articles = articleMapper.selectList(null);
            return ResultUtil.data(articles);
        } catch (Exception e) {
            e.printStackTrace();
            return ResultUtil.error(ResultCode.ERROR);
        }
    }

    @GetMapping("{id}")
    public ResultMessage<Article> getArticle(@PathVariable Integer id) {
        try {
            return ResultUtil.data(articleMapper.selectById(id));
        } catch (Exception e) {
            e.printStackTrace();
            return ResultUtil.error(ResultCode.ERROR);
        }
    }

    @PostMapping()
    public ResultMessage<Boolean> setArticle(@Valid @RequestBody Article article) {
        return ResultUtil.data(articleMapper.insert(article) > 0);
    }

    @PutMapping()
    public ResultMessage<Boolean> putArticle(@RequestBody Article article) {
        return ResultUtil.data(
                articleMapper.updateById(article) > 0);
    }

    @DeleteMapping("{id}")
    public ResultMessage<Boolean> deleteArticle(@PathVariable Integer id) {
        return ResultUtil.data(
                articleMapper.deleteById(id) > 0);
    }

    @GetMapping("query")
    public ResultMessage<Object> getPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        IPage<Article> iPage = new Page<>(page, pageSize);
        IPage<Article> result = articleMapper.selectPage(iPage, null);
        return ResultUtil.data(result);
    }

}
