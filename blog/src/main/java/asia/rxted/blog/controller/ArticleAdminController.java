package asia.rxted.blog.controller;

import javax.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import asia.rxted.blog.annotation.OptLog;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.model.dto.ArticleAdminDTO;
import asia.rxted.blog.model.dto.ArticleAdminViewDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.TopAndFeaturedArticlesDTO;
import asia.rxted.blog.model.vo.ArticleVO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.DeleteVO;
import asia.rxted.blog.modules.article.service.ArticleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;

import static asia.rxted.blog.constant.OptTypeConstant.*;

import java.util.List;

@Tag(name = "文章admin管理", description = "文章admin管理相关API")
@RestController()
@RequestMapping("admin")
public class ArticleAdminController {

    @Autowired
    private ArticleService articleService;

    @Operation(summary = "获取后台文章")
    @GetMapping("articles")
    public ResultMessage<PageResultDTO<ArticleAdminDTO>> listArticlesAdmin(ConditionVO conditionVO) {
        return ResultVO.data(articleService.listArticlesAdmin(conditionVO));
    }

    // 保存文章
    @OptLog(optType = SAVE_OR_UPDATE)
    @Operation(summary = "保存修改文章")
    @PostMapping("article")
    public ResultMessage<?> saveArticle(@Valid @RequestBody ArticleVO articleVO) {
        return ResultVO.data(articleService.saveOrUpdateArticle(articleVO));
    }

    // 获取置顶和推荐文章
    @Operation(summary = "获取置顶和推荐文章")
    @GetMapping("article/topAndFeatured")
    public ResultMessage<TopAndFeaturedArticlesDTO> listTopAndFeaturedArticles() {
        return ResultVO.data(articleService.listTopAndFeaturedArticles());
    }

    @Operation(summary = "删除或者恢复文章")
    @PutMapping("article")
    public ResultMessage<?> updateArticleDelete(@Valid @RequestBody DeleteVO deleteVO) {
        return ResultVO.status(articleService.updateArticleDelete(deleteVO));
    }

    @OptLog(optType = DELETE)
    @Operation(summary = "物理删除文章")
    @DeleteMapping("article/delete/{articleId}")
    public ResultMessage<?> deleteArticles(@PathVariable Integer articleId) {
        return ResultVO.status(articleService.hardDeleteById(articleId));
    }

    @OptLog(optType = UPLOAD)
    @Operation(summary = "上传文章图片")
    @Parameter(name = "file", description = "文章图片", required = true, schema = @Schema(type = "string", format = "binary"))
    @PostMapping("article/images")
    public ResultMessage<String> saveArticleImages(MultipartFile file) {
        // return ResultVO.ok(uploadStrategyContext.executeUploadStrategy(file,
        // FilePathEnum.ARTICLE.getPath()));
        return ResultVO.data("this is not implementing");
    }

    @Operation(summary = "根据id查看后台文章")
    @Parameter(name = "articleId", description = "文章id", required = true, schema = @Schema(type = "integer"))
    @GetMapping("article/{articleId}")
    public ResultMessage<ArticleAdminViewDTO> getArticleBackById(@PathVariable("articleId") Integer articleId) {
        return ResultVO.data(articleService.getArticleByIdAdmin(articleId));
    }

    @OptLog(optType = UPLOAD)
    @Operation(summary = "导入文章")
    @PostMapping("article/import")
    public ResultMessage<?> importArticles(MultipartFile file, @RequestParam(required = false) String type) {
        // articleImportStrategyContext.importArticles(file, type);
        // return ResultVO.ok();
        return ResultVO.data("this is not implement.");
    }

    @OptLog(optType = EXPORT)
    @Operation(summary = "导出文章")
    @Parameter(name = "articleIdList", description = "文章id", required = true, schema = @Schema(implementation = Integer.class, type = "array"))
    @PostMapping("article/export")
    public ResultMessage<List<String>> exportArticles(@RequestBody List<Integer> articleIds) {
        return ResultVO.data(articleService.exportArticles(articleIds));
    }

}
