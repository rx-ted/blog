package asia.rxted.blog.modules.talk.impl;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.config.BizException;
import asia.rxted.blog.enums.CommentTypeEnum;
import asia.rxted.blog.enums.TalkStatusEnum;
import asia.rxted.blog.mapper.CommentMapper;
import asia.rxted.blog.mapper.TalkMapper;
import asia.rxted.blog.model.dto.CommentCountDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.TalkAdminDTO;
import asia.rxted.blog.model.dto.TalkDTO;
import asia.rxted.blog.model.entity.Talk;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.TalkVO;
import asia.rxted.blog.modules.talk.TalkService;
import asia.rxted.blog.utils.BeanCopyUtil;
import asia.rxted.blog.utils.CommonUtil;
import asia.rxted.blog.utils.PageUtil;
import asia.rxted.blog.utils.UserUtil;

@Service
public class TalkServiceImpl extends ServiceImpl<TalkMapper, Talk> implements TalkService {

    @Autowired
    private TalkMapper talkMapper;

    @Autowired
    private CommentMapper commentMapper;

    @Override
    public PageResultDTO<TalkDTO> listTalks() {
        Long count = talkMapper.selectCount((new LambdaQueryWrapper<Talk>()
                .eq(Talk::getStatus, TalkStatusEnum.PUBLIC.getStatus())));
        if (count == 0) {
            return new PageResultDTO<>();
        }
        List<TalkDTO> talkDTOs = talkMapper.listTalks(PageUtil.getLimitCurrent(), PageUtil.getSize());
        List<Integer> talkIds = talkDTOs.stream()
                .map(TalkDTO::getId)
                .collect(Collectors.toList());
        Map<Integer, Integer> commentCountMap = commentMapper
                .listCommentCountByTypeAndTopicIds(CommentTypeEnum.TALK.getType(), talkIds)
                .stream()
                .collect(Collectors.toMap(CommentCountDTO::getId, CommentCountDTO::getCommentCount));
        talkDTOs.forEach(item -> {
            item.setCommentCount(commentCountMap.get(item.getId()));
            if (Objects.nonNull(item.getImages())) {
                item.setImgs(CommonUtil.castList(JSON.parseObject(item.getImages(), List.class), String.class));
            }
        });
        return new PageResultDTO<>(talkDTOs, count);

    }

    @Override
    public TalkDTO getTalkById(Integer talkId) {
        TalkDTO talkDTO = talkMapper.getTalkById(talkId);
        if (Objects.isNull(talkDTO)) {
            throw new BizException("说说不存在");
        }
        if (Objects.nonNull(talkDTO.getImages())) {
            talkDTO.setImgs(CommonUtil.castList(JSON.parseObject(talkDTO.getImages(), List.class), String.class));
        }
        CommentCountDTO commentCountDTO = commentMapper.listCommentCountByTypeAndTopicId(CommentTypeEnum.TALK.getType(),
                talkId);
        if (Objects.nonNull(commentCountDTO)) {
            talkDTO.setCommentCount(commentCountDTO.getCommentCount());
        }
        return talkDTO;
    }

    @Override
    public void saveOrUpdateTalk(TalkVO talkVO) {
        Talk talk = BeanCopyUtil.copyObject(talkVO, Talk.class);
        talk.setUserId(UserUtil.getUserDetailsDTO().getUserInfoId());
        this.saveOrUpdate(talk);
    }

    @Override
    public void deleteTalks(List<Integer> talkIdList) {
        talkMapper.deleteByIds(talkIdList);

    }

    @Override
    public PageResultDTO<TalkAdminDTO> listBackTalks(ConditionVO conditionVO) {
        Long count = talkMapper.selectCount(new LambdaQueryWrapper<Talk>()
                .eq(Objects.nonNull(conditionVO.getStatus()), Talk::getStatus, conditionVO.getStatus()));
        if (count == 0) {
            return new PageResultDTO<>();
        }
        List<TalkAdminDTO> talkDTOs = talkMapper.listTalksAdmin(PageUtil.getLimitCurrent(), PageUtil.getSize(),
                conditionVO);
        talkDTOs.forEach(item -> {
            if (Objects.nonNull(item.getImages())) {
                item.setImgs(CommonUtil.castList(JSON.parseObject(item.getImages(), List.class), String.class));
            }
        });
        return new PageResultDTO<>(talkDTOs, count);
    }

    @Override
    public TalkAdminDTO getBackTalkById(Integer talkId) {
        TalkAdminDTO talkBackDTO = talkMapper.getTalkByIdAdmin(talkId);
        if (Objects.nonNull(talkBackDTO.getImages())) {
            talkBackDTO
                    .setImgs(CommonUtil.castList(JSON.parseObject(talkBackDTO.getImages(), List.class), String.class));
        }
        return talkBackDTO;
    }

}
