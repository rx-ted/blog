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

    void saveOrUpdateTag(TagVO tagVO);

    void deleteTag(List<Integer> tagIds);

}
