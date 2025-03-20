package asia.rxted.blog.modules.user.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import asia.rxted.blog.model.entity.UserAuth;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.modules.user.dto.UserAdminDTO;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface UserAuthMapper extends BaseMapper<UserAuth> {

    List<UserAdminDTO> listUsers(@Param("current") Long current, @Param("size") Long size, @Param("conditionVO") ConditionVO conditionVO);

    Integer countUser(@Param("conditionVO") ConditionVO conditionVO);

}
