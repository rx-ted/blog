package asia.rxted.blog.handler;

import java.io.Serializable;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.PermissionEvaluator;
import org.springframework.security.core.Authentication;

import asia.rxted.blog.mapper.RoleMapper;
import asia.rxted.blog.model.dto.UserDetailsDTO;

public class PermissionEvaluatorImpl implements PermissionEvaluator {

    @Autowired
    private RoleMapper roleMapper;

    @Override
    public boolean hasPermission(Authentication authentication, Object targetDomainObject, Object permission) {
        UserDetailsDTO userDetailsDTO = (UserDetailsDTO) authentication.getPrincipal();

        Set<String> permissions = new HashSet<String>(); // 用户权限

        List<String> authList = roleMapper.listRolesByUserInfoId(userDetailsDTO.getId());
        authList.forEach(auth -> {
            permissions.add(auth);
        });

        // 判断是否拥有权限
        if (permissions.contains(permission.toString())) {
            return true;
        }
        return false;

    }

    @Override
    public boolean hasPermission(Authentication authentication, Serializable targetId, String targetType,
            Object permission) {
        return false;

    }

}
