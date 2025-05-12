package asia.rxted.blog.mapper;


import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import asia.rxted.blog.model.entity.Role;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.dto.ResourceRoleDTO;
import asia.rxted.blog.model.dto.RoleDTO;

import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface RoleMapper extends BaseMapper<Role> {

    List<ResourceRoleDTO> listResourceRoles();

    List<String> listRolesByUserInfoId(@Param("userInfoId") Integer userInfoId);

    List<RoleDTO> listRoles(@Param("current") Long current, @Param("size") Long size, @Param("conditionVO") ConditionVO conditionVO);

}
