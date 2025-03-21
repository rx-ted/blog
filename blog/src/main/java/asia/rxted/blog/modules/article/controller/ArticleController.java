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
import org.springframework.web.multipart.MultipartFile;

import asia.rxted.blog.config.enums.FilePathEnum;
import asia.rxted.blog.model.dto.ArchiveDTO;
import asia.rxted.blog.model.dto.ArticleAdminDTO;
import asia.rxted.blog.model.dto.ArticleAdminViewDTO;
import asia.rxted.blog.model.dto.ArticleCardDTO;
import asia.rxted.blog.model.dto.ArticleDTO;
import asia.rxted.blog.model.dto.ArticleSearchDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.TopAndFeaturedArticlesDTO;
import asia.rxted.blog.model.vo.ArticlePasswordVO;
import asia.rxted.blog.model.vo.ArticleTopFeaturedVO;
import asia.rxted.blog.model.vo.ArticleVO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.DeleteVO;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultUtil;
import asia.rxted.blog.config.annotation.OptLog;
import asia.rxted.blog.modules.article.service.ArticleService;
import asia.rxted.blog.modules.strategy.context.ArticleImportStrategyContext;
import asia.rxted.blog.modules.strategy.context.UploadStrategyContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;

import static asia.rxted.blog.config.constant.OptTypeConstant.*;

@Tag(name = "文章管理", description = "文章管理相关API")
@RestController()
@RequestMapping("articles")
public class ArticleController {

    @Autowired
    private ArticleService articleService;

    @Autowired
    private UploadStrategyContext uploadStrategyContext;

    @Autowired
    private ArticleImportStrategyContext articleImportStrategyContext;

    @Operation(summary = "获取置顶和推荐文章")
    @GetMapping("topAndFeatured")
    public ResultMessage<TopAndFeaturedArticlesDTO> listTopAndFeaturedArticles() {
        return ResultUtil.data(articleService.listTopAndFeaturedArticles());
    }

    @Operation(summary = "获取所有文章")
    @GetMapping("all")
    public ResultMessage<PageResultDTO<ArticleCardDTO>> listArticles() {

        return ResultUtil.data(articleService.listArticles());
    }

    @Operation(summary = "根据分类id获取文章")
    @GetMapping("categoryId")
    public ResultMessage<PageResultDTO<ArticleCardDTO>> getArticlesByCategoryId(@RequestParam Integer categoryId) {
        return ResultUtil.data(articleService.listArticlesByCategoryId(categoryId));
    }

    @Operation(summary = "根据id获取文章")
    @GetMapping("{articleId}")
    public ResultMessage<ArticleDTO> getArticleById(@PathVariable("articleId") Integer articleId) {
        return ResultUtil.data(articleService.getArticleById(articleId));
    }

    @Operation(summary = "校验文章访问密码")
    @PostMapping("access")
    public ResultMessage<?> accessArticle(@Valid @RequestBody ArticlePasswordVO articlePasswordVO) {
        articleService.accessArticle(articlePasswordVO);
        return ResultUtil.success();
    }

    @Operation(summary = "根据标签id获取文章")
    @GetMapping("tagId")
    public ResultMessage<PageResultDTO<ArticleCardDTO>> listArticlesByTagId(@RequestParam Integer tagId) {
        return ResultUtil.data(articleService.listArticlesByTagId(tagId));
    }

    @Operation(summary = "获取所有文章归档")
    @GetMapping("archives/all")
    public ResultMessage<PageResultDTO<ArchiveDTO>> listArchives() {
        return ResultUtil.data(articleService.listArchives());
    }

    @Operation(summary = "获取后台文章")
    @GetMapping("admin")
    public ResultMessage<PageResultDTO<ArticleAdminDTO>> listArticlesAdmin(ConditionVO conditionVO) {
        return ResultUtil.data(articleService.listArticlesAdmin(conditionVO));
    }

    @OptLog(optType = SAVE_OR_UPDATE)
    @Operation(summary = "保存和修改文章")
    @PostMapping("admin")
    public ResultMessage<?> saveOrUpdateArticle(@Valid @RequestBody ArticleVO articleVO) {
        articleService.saveOrUpdateArticle(articleVO);
        return ResultUtil.success();
    }

    @OptLog(optType = UPDATE)
    @Operation(summary = "修改文章是否置顶和推荐")
    @PutMapping("admin/topAndFeatured")
    public ResultMessage<?> updateArticleTopAndFeatured(@Valid @RequestBody ArticleTopFeaturedVO articleTopFeaturedVO) {
        articleService.updateArticleTopAndFeatured(articleTopFeaturedVO);
        return ResultUtil.success();
    }

    @Operation(summary = "删除或者恢复文章")
    @PutMapping("admin")
    public ResultMessage<?> updateArticleDelete(@Valid @RequestBody DeleteVO deleteVO) {
        articleService.updateArticleDelete(deleteVO);
        return ResultUtil.success();
    }

    @OptLog(optType = DELETE)
    @Operation(summary = "物理删除文章")
    @DeleteMapping("/admin/delete")
    public ResultMessage<?> deleteArticles(@RequestBody List<Integer> articleIds) {
        articleService.deleteArticles(articleIds);
        return ResultUtil.success();
    }

    @OptLog(optType = UPLOAD)
    @Operation(summary = "上传文章图片")
    @Parameter(name = "file", description = "文章图片", required = true /* ,type = "MultipartFile" */
    )
    @PostMapping("/admin/images")
    public ResultMessage<String> saveArticleImages(MultipartFile file) {
        return ResultUtil.data(uploadStrategyContext.executeUploadStrategy(file, FilePathEnum.ARTICLE.getPath()));
    }

    @Operation(summary = "根据id查看后台文章")
    @Parameter(name = "articleId", description = "文章id", required = true /* ,type = "Integer" */)
    @GetMapping("/admin/{articleId}")
    public ResultMessage<ArticleAdminViewDTO> getArticleBackById(@PathVariable("articleId") Integer articleId) {
        return ResultUtil.data(articleService.getArticleByIdAdmin(articleId));
    }

    @OptLog(optType = UPLOAD)
    @Operation(summary = "导入文章")
    @PostMapping("/admin/import")
    public ResultMessage<?> importArticles(MultipartFile file, @RequestParam(required = false) String type) {
        articleImportStrategyContext.importArticles(file, type);
        return ResultUtil.success();
    }

    @OptLog(optType = EXPORT)
    @Operation(summary = "导出文章")
    @Parameter(name = "articleIdList", description = "文章id", required = true/* , type = "List<Integer>" */)
    @PostMapping("/admin/export")
    public ResultMessage<List<String>> exportArticles(@RequestBody List<Integer> articleIds) {
        return ResultUtil.data(articleService.exportArticles(articleIds));
    }

    @Operation(summary = "搜索文章")
    @GetMapping("/search")
    public ResultMessage<List<ArticleSearchDTO>> listArticlesBySearch(ConditionVO condition) {
        return ResultUtil.data(articleService.listArticlesBySearch(condition));
    }


    @Operation(summary = "搜索第一个文章")
    @GetMapping("/search/first")
    public ResultMessage<ArticleSearchDTO> getFirstArticleBySearch() {
        return ResultUtil.data(articleService.getFirstArticleBySearch());
    }

}
