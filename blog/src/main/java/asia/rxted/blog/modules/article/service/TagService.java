package asia.rxted.blog.modules.article.service;

import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.TagAdminDTO;
import asia.rxted.blog.model.dto.TagDTO;
import asia.rxted.blog.model.entity.Tag;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.TagVO;

import java.util.List;

public interface TagService extends IService<Tag> {

    List<TagDTO> listTags();

    List<TagDTO> listTopTenTags();

    PageResultDTO<TagAdminDTO> listTagsAdmin(ConditionVO conditionVO);

    List<TagAdminDTO> listTagsAdminBySearch(ConditionVO conditionVO);

    Boolean saveTag(String tagName);

    List<Boolean> saveTags(List<String> tagNames);

    Boolean updateTag(TagVO tagVO);

    List<Boolean> updateTags(List<TagVO> tagList);

    Boolean deleteTag(Integer tagId);

    Boolean deleteTags(List<Integer> tagIds);

    List<Tag> checkOrSaveTagsByName(List<String> tagList);

}
