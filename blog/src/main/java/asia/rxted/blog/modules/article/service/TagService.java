package asia.rxted.blog.modules.article.service;


import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.modules.article.dto.PageResultDTO;
import asia.rxted.blog.modules.article.dto.TagAdminDTO;
import asia.rxted.blog.modules.article.dto.TagDTO;
import asia.rxted.blog.modules.article.entity.Tag;
import asia.rxted.blog.modules.article.vo.ConditionVO;
import asia.rxted.blog.modules.article.vo.TagVO;

import java.util.List;

public interface TagService extends IService<Tag> {

    List<TagDTO> listTags();

    List<TagDTO> listTopTenTags();

    PageResultDTO<TagAdminDTO> listTagsAdmin(ConditionVO conditionVO);

    List<TagAdminDTO> listTagsAdminBySearch(ConditionVO conditionVO);

    void saveOrUpdateTag(TagVO tagVO);

    void deleteTag(List<Integer> tagIds);

}
