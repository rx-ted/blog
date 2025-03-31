package asia.rxted.blog.modules.article.serviceImpl;

import java.util.Objects;

import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.mapper.CategoryMapper;
import asia.rxted.blog.model.entity.Category;
import asia.rxted.blog.modules.article.service.CategoryService;

@Service
public class CategoryServiceImpl extends ServiceImpl<CategoryMapper, Category> implements CategoryService {

    @Override
    public Category checkOrSaveCategoryByName(String categoryName) {
        LambdaQueryWrapper<Category> wrapper = new LambdaQueryWrapper<Category>().eq(Category::getCategoryName,
                categoryName);
        Category category = this.getOne(wrapper);
        if (Objects.nonNull(category)) {
            return category;
        }
        if (this.save(Category.builder().categoryName(categoryName).build())) {
            return this.getOne(wrapper);
        }
        return null;
    }
}
