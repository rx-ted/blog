package asia.rxted.blog.modules.user.mapper;


import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import asia.rxted.blog.modules.article.vo.ConditionVO;
import asia.rxted.blog.modules.user.dto.ResourceRoleDTO;
import asia.rxted.blog.modules.user.dto.RoleDTO;
import asia.rxted.blog.modules.user.entity.Role;

import org.apache.ibatis.annotations.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoleMapper extends BaseMapper<Role> {

    List<ResourceRoleDTO> listResourceRoles();

    List<String> listRolesByUserInfoId(@Param("userInfoId") Integer userInfoId);

    List<RoleDTO> listRoles(@Param("current") Long current, @Param("size") Long size, @Param("conditionVO") ConditionVO conditionVO);

}
