package asia.rxted.blog.controller;

import java.util.List;

import javax.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import asia.rxted.blog.model.dto.ArchiveDTO;
import asia.rxted.blog.model.dto.ArticleCardDTO;
import asia.rxted.blog.model.dto.ArticleDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.SearchDTO;
import asia.rxted.blog.model.vo.ArticlePasswordVO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.DeleteVO;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.modules.article.service.ArticleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;

@Tag(name = "文章管理", description = "文章管理相关API")
@RestController()
@RequestMapping("article")
public class ArticleController {

    @Autowired
    private ArticleService articleService;

    // 获取所有文章归档
    @Operation(summary = "获取所有文章归档")
    @GetMapping("archives/all")
    public ResultMessage<PageResultDTO<ArchiveDTO>> listArchives() {
        return ResultVO.data(articleService.listArchives());
    }

    // 根据id获取文章
    @Operation(summary = "根据id获取文章")
    @GetMapping("{articleId}")
    public ResultMessage<ArticleDTO> getArticleById(@PathVariable("articleId") Integer articleId) {
        return ResultVO.data(articleService.getArticleById(articleId));
    }

    @Operation(summary = "获取所有文章")
    @GetMapping("all")
    public ResultMessage<PageResultDTO<ArticleCardDTO>> listArticles() {

        return ResultVO.data(articleService.listArticles());
    }

    @Operation(summary = "删除或者恢复文章")
    @PutMapping("delete")
    public ResultMessage<?> updateArticleDelete(@Valid @RequestBody DeleteVO deleteVO) {
        return ResultVO.status(articleService.softDeleteById(deleteVO));
    }

    @Operation(summary = "搜索文章")
    @GetMapping("/search")
    public ResultMessage<List<SearchDTO>> listArticlesBySearch(ConditionVO condition) {
        return ResultVO.data(articleService.search(condition));
    }

    @Operation(summary = "根据分类id获取文章")
    @GetMapping("categoryId")
    public ResultMessage<PageResultDTO<ArticleCardDTO>> getArticlesByCategoryId(@RequestParam Integer categoryId) {
        return ResultVO.data(articleService.listArticlesByCategoryId(categoryId));
    }

    @Operation(summary = "校验文章访问密码")
    @PostMapping("access")
    public ResultMessage<?> accessArticle(@Valid @RequestBody ArticlePasswordVO articlePasswordVO) {
        return ResultVO.status(articleService.accessArticle(articlePasswordVO));
    }

    @Operation(summary = "根据标签id获取文章")
    @GetMapping("tagId")
    public ResultMessage<PageResultDTO<ArticleCardDTO>> listArticlesByTagId(@RequestParam Integer tagId) {
        return ResultVO.data(articleService.listArticlesByTagId(tagId));
    }

}
