package asia.rxted.blog.modules.article.controller;

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
import asia.rxted.blog.modules.article.service.ArticleServer;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;

@Tag(name = "文章管理", description = "文章管理相关API")
@RestController()
@RequestMapping("articles")

public class ArticleController {
    @Autowired
    private ArticleServer articleServer;

    @Operation(summary = "获取所有的文章")
    @GetMapping()
    public ResultMessage<List<Article>> getArticles() {
        try {
            List<Article> articles = articleServer.list();
            return ResultUtil.data(articles);
        } catch (Exception e) {
            e.printStackTrace();
            return ResultUtil.error(ResultCode.ERROR);
        }
    }

    @Operation(summary = "根据id读取对应的文章")
    @GetMapping("{id}")
    public ResultMessage<Article> getArticle(@PathVariable Integer id) {
        try {
            return ResultUtil.data(articleServer.getById(id));
        } catch (Exception e) {
            e.printStackTrace();
            return ResultUtil.error(ResultCode.ERROR);
        }
    }

    @Operation(summary="保存文章的一些信息")
    @PostMapping()
    public ResultMessage<Boolean> setArticle(@Valid @RequestBody Article article) {
        return ResultUtil.data(
                articleServer.save(article));
    }

    @Operation(summary="更新文章的一些信息")
    @PutMapping()
    public ResultMessage<Boolean> putArticle(@RequestBody Article article) {
        return ResultUtil.data(
                articleServer.updateById(article));
    }

    @Operation(summary="根据id删除文章")
    @DeleteMapping("{id}")
    public ResultMessage<Boolean> deleteArticle(@PathVariable Integer id) {
        return ResultUtil.data(
                articleServer.removeById(id));
    }

    @Operation(summary="根据页码和每页读取大小获取文章")
    @GetMapping("query")
    public ResultMessage<Object> getPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        IPage<Article> iPage = new Page<>(page, pageSize);
        IPage<Article> result = articleServer.page(iPage, null);
        return ResultUtil.data(result);
    }
}
