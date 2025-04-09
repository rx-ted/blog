package asia.rxted.blog.controller;

import static asia.rxted.blog.constant.OptTypeConstant.*;

import java.util.List;

import javax.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import asia.rxted.blog.model.dto.ArticleCardDTO;
import asia.rxted.blog.model.dto.ArticleDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.SearchDTO;
import asia.rxted.blog.model.dto.TopAndFeaturedArticlesDTO;
import asia.rxted.blog.model.vo.ArticleVO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.DeleteVO;
import asia.rxted.blog.annotation.OptLog;
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
    // @Operation(summary = "获取所有文章归档")
    // @GetMapping("archives/all")
    // public ResultMessage<PageResultDTO<ArchiveDTO>> listArchives() {
    // return ResultUtil.data(articleService.listArchives());
    // }

    // 保存文章
    @OptLog(optType = SAVE_OR_UPDATE)
    @Operation(summary = "保存修改文章")
    @PostMapping()
    public ResultMessage<?> saveArticle(@Valid @RequestBody ArticleVO articleVO) {
        return ResultVO.data(articleService.saveOrUpdateArticle(articleVO));
    }

    // 根据id获取文章
    @Operation(summary = "根据id获取文章")
    @GetMapping("{articleId}")
    public ResultMessage<ArticleDTO> getArticleById(@PathVariable("articleId") Integer articleId) {
        return ResultVO.data(articleService.getArticleById(articleId));
    }

    // 删除文章
    @Operation(summary = "获取置顶和推荐文章")
    @GetMapping("topAndFeatured")
    public ResultMessage<TopAndFeaturedArticlesDTO> listTopAndFeaturedArticles() {
        return ResultVO.data(articleService.listTopAndFeaturedArticles());
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

    @OptLog(optType = DELETE)
    @Operation(summary = "物理删除文章")
    @DeleteMapping("delete/{articleId}")
    public ResultMessage<?> deleteArticles(@PathVariable Integer articleId) {
        return ResultVO.status(articleService.hardDeleteById(articleId));
    }

    @Operation(summary = "搜索文章")
    @GetMapping("/search")
    public ResultMessage<List<SearchDTO>> listArticlesBySearch(ConditionVO condition) {
        return ResultVO.data(articleService.search(condition));
    }

}
