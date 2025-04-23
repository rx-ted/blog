package asia.rxted.blog.modules.talk;

import java.util.List;

import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.TalkAdminDTO;
import asia.rxted.blog.model.dto.TalkDTO;
import asia.rxted.blog.model.entity.Talk;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.TalkVO;

public interface TalkService extends IService<Talk> {
    PageResultDTO<TalkDTO> listTalks();

    TalkDTO getTalkById(Integer talkId);

    void saveOrUpdateTalk(TalkVO talkVO);

    void deleteTalks(List<Integer> talkIdList);

    PageResultDTO<TalkAdminDTO> listBackTalks(ConditionVO conditionVO);

    TalkAdminDTO getBackTalkById(Integer talkId);
}
