package asia.rxted.blog.modules.article.serviceImpl;

import java.util.List;
import java.util.Objects;

import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.config.BizException;
import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.mapper.ArticleMapper;
import asia.rxted.blog.mapper.CategoryMapper;
import asia.rxted.blog.model.dto.CategoryAdminDTO;
import asia.rxted.blog.model.dto.CategoryDTO;
import asia.rxted.blog.model.dto.CategoryOptionDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.entity.Article;
import asia.rxted.blog.model.entity.Category;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.modules.article.service.CategoryService;
import asia.rxted.blog.utils.BeanCopyUtil;
import asia.rxted.blog.utils.PageUtil;
import lombok.SneakyThrows;

@Service
public class CategoryServiceImpl extends ServiceImpl<CategoryMapper, Category> implements CategoryService {

    @Autowired
    private CategoryMapper categoryMapper;

    @Autowired
    private ArticleMapper articleMapper;

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

    @Override
    public List<CategoryDTO> listCategories() {
        return categoryMapper.listCategories();
    }

    @Override
    @SneakyThrows
    public PageResultDTO<CategoryAdminDTO> listCategoriesAdmin(ConditionVO conditionVO) {
        Long count = categoryMapper.selectCount(new LambdaQueryWrapper<Category>()
                .like(StringUtils.isNotBlank(conditionVO.getKeywords()), Category::getCategoryName,
                        conditionVO.getKeywords()));
        if (count == 0) {
            return new PageResultDTO<>();
        }
        List<CategoryAdminDTO> categoryList = categoryMapper.listCategoriesAdmin(PageUtil.getLimitCurrent(),
                PageUtil.getSize(), conditionVO);
        return new PageResultDTO<>(categoryList, count);

    }

    @SneakyThrows
    @Override
    public List<CategoryOptionDTO> listCategoriesBySearch(ConditionVO conditionVO) {
        List<Category> categoryList = categoryMapper.selectList(new LambdaQueryWrapper<Category>()
                .like(StringUtils.isNotBlank(conditionVO.getKeywords()), Category::getCategoryName,
                        conditionVO.getKeywords())
                .orderByDesc(Category::getId));
        return BeanCopyUtil.copyList(categoryList, CategoryOptionDTO.class);
    }

    @Override
    public void deleteCategories(List<Integer> categoryIds) {
        Long count = articleMapper.selectCount(new LambdaQueryWrapper<Article>()
                .in(Article::getCategoryId, categoryIds));
        if (count > 0) {
            throw new BizException(ResultCode.ARTICLE_TAG_EXISTS_DELETE_ERROR);
        }
        categoryMapper.deleteByIds(categoryIds);
    }
}
