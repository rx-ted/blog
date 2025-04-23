package asia.rxted.blog.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import asia.rxted.blog.annotation.OptLog;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.constant.OptTypeConstant;
import asia.rxted.blog.model.dto.CategoryAdminDTO;
import asia.rxted.blog.model.dto.CategoryDTO;
import asia.rxted.blog.model.dto.CategoryOptionDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.modules.article.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import javax.validation.Valid;
import java.util.List;

@Tag(name = "分类模块")
@RestController
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    @Operation(summary = "获取所有分类")
    @GetMapping("/categories/all")
    public ResultMessage<List<CategoryDTO>> listCategories() {
        return ResultVO.data(categoryService.listCategories());
    }

    @Operation(summary = "查看后台分类列表")
    @GetMapping("/admin/categories")
    public ResultMessage<PageResultDTO<CategoryAdminDTO>> listCategoriesAdmin(ConditionVO conditionVO) {
        return ResultVO.data(categoryService.listCategoriesAdmin(conditionVO));
    }

    @Operation(summary = "搜索文章分类")
    @GetMapping("/admin/categories/search")
    public ResultMessage<List<CategoryOptionDTO>> listCategoriesAdminBySearch(ConditionVO conditionVO) {
        return ResultVO.data(categoryService.listCategoriesBySearch(conditionVO));
    }

    @OptLog(optType = OptTypeConstant.DELETE)
    @Operation(summary = "删除分类")
    @DeleteMapping("/admin/categories")
    public ResultMessage<?> deleteCategories(@RequestBody List<Integer> categoryIds) {
        categoryService.deleteCategories(categoryIds);
        return ResultVO.success();
    }

    @OptLog(optType = OptTypeConstant.SAVE_OR_UPDATE)
    @Operation(summary = "添加或修改分类")
    @PostMapping("/admin/categories")
    public ResultMessage<?> saveOrUpdateCategory(@Valid @RequestBody String name) {
        categoryService.checkOrSaveCategoryByName(name);
        return ResultVO.success();
    }

}
