package asia.rxted.blog.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import asia.rxted.blog.model.dto.TagAdminDTO;
import asia.rxted.blog.model.dto.TagDTO;
import asia.rxted.blog.model.entity.Tag;
import asia.rxted.blog.model.vo.ConditionVO;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TagMapper extends BaseMapper<Tag> {

    List<TagDTO> listTags();

    List<TagDTO> listTopTenTags();

    List<String> listTagNamesByArticleId(Integer articleId);

    List<TagAdminDTO> listTagsAdmin(@Param("current") Long current, @Param("size") Long size,
            @Param("conditionVO") ConditionVO conditionVO);

}
