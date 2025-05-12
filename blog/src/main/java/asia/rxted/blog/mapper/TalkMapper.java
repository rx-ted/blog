package asia.rxted.blog.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import asia.rxted.blog.model.dto.TalkAdminDTO;
import asia.rxted.blog.model.dto.TalkDTO;
import asia.rxted.blog.model.entity.Talk;
import asia.rxted.blog.model.vo.ConditionVO;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TalkMapper extends BaseMapper<Talk> {

    List<TalkDTO> listTalks(@Param("current") Long current, @Param("size") Long size);

    TalkDTO getTalkById(@Param("talkId") Integer talkId);

    List<TalkAdminDTO> listTalksAdmin(@Param("current") Long current, @Param("size") Long size,
            @Param("conditionVO") ConditionVO conditionVO);

    TalkAdminDTO getTalkByIdAdmin(@Param("talkId") Integer talkId);

}
