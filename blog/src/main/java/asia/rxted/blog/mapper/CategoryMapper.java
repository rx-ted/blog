package asia.rxted.blog.mapper;


import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import asia.rxted.blog.model.dto.CategoryAdminDTO;
import asia.rxted.blog.model.dto.CategoryDTO;
import asia.rxted.blog.model.entity.Category;
import asia.rxted.blog.model.vo.ConditionVO;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;


@Mapper
public interface CategoryMapper extends BaseMapper<Category> {

    List<CategoryDTO> listCategories();

    List<CategoryAdminDTO> listCategoriesAdmin(@Param("current") Long current, @Param("size") Long size, @Param("conditionVO") ConditionVO conditionVO);

}
