package asia.rxted.blog.modules.article.service;

import java.util.List;

import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.model.dto.CategoryAdminDTO;
import asia.rxted.blog.model.dto.CategoryDTO;
import asia.rxted.blog.model.dto.CategoryOptionDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.entity.Category;
import asia.rxted.blog.model.vo.ConditionVO;

public interface CategoryService extends IService<Category> {

    Category checkOrSaveCategoryByName(String categoryName);

    List<CategoryDTO> listCategories();

    PageResultDTO<CategoryAdminDTO> listCategoriesAdmin(ConditionVO conditionVO);

    List<CategoryOptionDTO> listCategoriesBySearch(ConditionVO conditionVO);

    void deleteCategories(List<Integer> categoryIds);


}
