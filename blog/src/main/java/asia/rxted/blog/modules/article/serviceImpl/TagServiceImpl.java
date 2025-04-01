package asia.rxted.blog.modules.article.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.mapper.TagMapper;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.TagAdminDTO;
import asia.rxted.blog.model.dto.TagDTO;
import asia.rxted.blog.model.entity.Tag;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.TagVO;
import asia.rxted.blog.modules.article.service.TagService;
import asia.rxted.blog.utils.BeanCopyUtil;
import asia.rxted.blog.utils.PageUtil;
import lombok.SneakyThrows;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class TagServiceImpl extends ServiceImpl<TagMapper, Tag> implements TagService {

    @Autowired
    private TagMapper tagMapper;

    @Override
    public Boolean saveTag(String tagName) {
        Tag existTag = tagMapper.selectOne(new LambdaQueryWrapper<Tag>()
                .select(Tag::getId)
                .eq(Tag::getTagName, tagName));

        if (Objects.nonNull(existTag)) {
            ResultVO.fail(ResultCode.ARTICLE_TAG_IS_EXIST);
        }
        Tag tag = Tag.builder().tagName(tagName).build();
        return this.save(tag);
    }

    @Override
    public Boolean updateTag(TagVO tagVO) {
        Tag tag = Tag.builder().id(tagVO.getId()).tagName(tagVO.getTagName()).build();
        return this.updateById(tag);
    }

    @Override
    public List<Boolean> saveTags(List<String> tagNames) {
        List<Boolean> status = new ArrayList<>();
        tagNames.forEach(tagName -> {
            status.add(this.saveTag(tagName));
        });
        return status;
    }

    @Override
    public List<Boolean> updateTags(List<TagVO> tagList) {
        List<Boolean> status = new ArrayList<>();
        tagList.forEach(tagVO -> {
            status.add(
                    this.updateTag(tagVO));
        });
        return status;
    }

    @Override
    public List<TagDTO> listTags() {
        return tagMapper.listTags();
    }

    @Override
    public List<TagDTO> listTopTenTags() {
        return tagMapper.listTopTenTags();
    }

    @Override
    public Boolean deleteTag(Integer tagId) {
        return tagMapper.deleteById(tagId) > 0;
    }

    @Override
    public Boolean deleteTags(List<Integer> tagIds) {
        return tagMapper.deleteByIds(tagIds, true) == tagIds.size();
    }

    @SneakyThrows
    @Override
    public PageResultDTO<TagAdminDTO> listTagsAdmin(ConditionVO conditionVO) {
        Long count = tagMapper.selectCount(new LambdaQueryWrapper<Tag>()
                .like(StringUtils.isNotBlank(conditionVO.getKeywords()), Tag::getTagName, conditionVO.getKeywords()));
        if (count == 0) {
            return new PageResultDTO<>();
        }
        List<TagAdminDTO> tags = tagMapper.listTagsAdmin(PageUtil.getLimitCurrent(), PageUtil.getSize(), conditionVO);
        return new PageResultDTO<>(tags, count);
    }

    @SneakyThrows
    @Override
    public List<TagAdminDTO> listTagsAdminBySearch(ConditionVO conditionVO) {
        List<Tag> tags = tagMapper.selectList(new LambdaQueryWrapper<Tag>()
                .like(StringUtils.isNotBlank(conditionVO.getKeywords()), Tag::getTagName, conditionVO.getKeywords())
                .orderByDesc(Tag::getId));
        return BeanCopyUtil.copyList(tags, TagAdminDTO.class);
    }

    @Override
    public List<Tag> checkOrSaveTagsByName(List<String> tagList) {
        if (Objects.isNull(tagList)) {
            return null;
        }
        List<Tag> tags = new ArrayList<>();
        tagList.forEach(name -> {
            LambdaQueryWrapper<Tag> wrapper = new LambdaQueryWrapper<Tag>().eq(Tag::getTagName, name);
            Tag tag = this.getOne(wrapper);
            if (Objects.nonNull(tag))
                tags.add(tag);
            else {
                if (this.save(Tag.builder().tagName(name).build())) {
                    tags.add(this.getOne(wrapper));
                } else {
                    tags.add(null);
                }
            }
        });
        return tags;
    }

}
