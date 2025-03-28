package asia.rxted.blog.modules.article.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultUtil;
import asia.rxted.blog.mapper.ArticleTagMapper;
import asia.rxted.blog.mapper.TagMapper;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.TagAdminDTO;
import asia.rxted.blog.model.dto.TagDTO;
import asia.rxted.blog.model.entity.ArticleTag;
import asia.rxted.blog.model.entity.Tag;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.TagVO;
import asia.rxted.blog.modules.article.service.TagService;
import asia.rxted.blog.utils.BeanCopyUtil;
import asia.rxted.blog.utils.PageUtil;
import lombok.SneakyThrows;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class TagServiceImpl extends ServiceImpl<TagMapper, Tag> implements TagService {

    @Autowired
    private TagMapper tagMapper;

    @Autowired
    private ArticleTagMapper articleTagMapper;

    @Override
    public List<TagDTO> listTags() {
        return tagMapper.listTags();
    }

    @Override
    public List<TagDTO> listTopTenTags() {
        return tagMapper.listTopTenTags();
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
        return new PageResultDTO<>(tags, Math.toIntExact(count));
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
    public void saveOrUpdateTag(TagVO tagVO) {
        Tag existTag = tagMapper.selectOne(new LambdaQueryWrapper<Tag>()
                .select(Tag::getId)
                .eq(Tag::getTagName, tagVO.getTagName()));
        if (Objects.nonNull(existTag) && !existTag.getId().equals(tagVO.getId())) {
            ResultUtil.fail(ResultCode.ARTICLE_TAG_IS_EXIST);
        }
        Tag tag = BeanCopyUtil.copyObject(tagVO, Tag.class);
        this.saveOrUpdate(tag);
    }

    @Override
    public void deleteTag(List<Integer> tagIds) {
        Long count = articleTagMapper.selectCount(new LambdaQueryWrapper<ArticleTag>()
                .in(ArticleTag::getTagId, tagIds));
        if (count > 0) {
            ResultUtil.fail(ResultCode.ARTICLE_TAG_EXISTS_DELETE_ERROR);

        }
        tagMapper.deleteByIds(tagIds, true);
    }

}
