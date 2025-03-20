package asia.rxted.blog.modules.article.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import asia.rxted.blog.modules.article.dto.TagAdminDTO;
import asia.rxted.blog.modules.article.dto.TagDTO;
import asia.rxted.blog.modules.article.entity.Tag;
import asia.rxted.blog.modules.article.vo.ConditionVO;

import org.apache.ibatis.annotations.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TagMapper extends BaseMapper<Tag> {

    List<TagDTO> listTags();

    List<TagDTO> listTopTenTags();

    List<String> listTagNamesByArticleId(Integer articleId);

    List<TagAdminDTO> listTagsAdmin(@Param("current") Long current, @Param("size") Long size,
            @Param("conditionVO") ConditionVO conditionVO);

}
