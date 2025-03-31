package asia.rxted.blog.modules.article.service;

import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.model.entity.Category;

public interface CategoryService extends IService<Category> {

    Category checkOrSaveCategoryByName(String categoryName);

}
