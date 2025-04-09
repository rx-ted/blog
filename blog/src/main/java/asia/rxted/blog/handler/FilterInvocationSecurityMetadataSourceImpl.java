package asia.rxted.blog.handler;

import java.util.Collection;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.ConfigAttribute;
import org.springframework.security.access.SecurityConfig;
import org.springframework.security.web.FilterInvocation;
import org.springframework.security.web.access.intercept.FilterInvocationSecurityMetadataSource;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;

import com.baomidou.mybatisplus.core.toolkit.CollectionUtils;

import asia.rxted.blog.mapper.RoleMapper;
import asia.rxted.blog.model.dto.ResourceRoleDTO;
import jakarta.annotation.PostConstruct;

@Component
public class FilterInvocationSecurityMetadataSourceImpl implements FilterInvocationSecurityMetadataSource {

    @Autowired
    private RoleMapper roleMapper;

    private static List<ResourceRoleDTO> resourceRoleDTOs;

    @PostConstruct
    private void loadResourceRole() {
        resourceRoleDTOs = roleMapper.listResourceRoles();
    }

    public void clearResourceRole() {
        resourceRoleDTOs = null;
    }

    @Override
    public Collection<ConfigAttribute> getAttributes(Object object) throws IllegalArgumentException {
        if (CollectionUtils.isEmpty(resourceRoleDTOs)) {
            this.loadResourceRole();
        }
        FilterInvocation fi = (FilterInvocation) object;
        String method = fi.getRequest().getMethod();
        String uri = fi.getRequest().getRequestURI();
        AntPathMatcher antPathMatcher = new AntPathMatcher();
        for (ResourceRoleDTO resourceRoleDTO : resourceRoleDTOs) {
            if (antPathMatcher.match(resourceRoleDTO.getUrl(), uri)
                    && resourceRoleDTO.getRequestMethod().equals(method)) {
                List<String> roleList = resourceRoleDTO.getRoleList();
                if (CollectionUtils.isEmpty(roleList)) {
                    return SecurityConfig.createList("disable");
                }
                return SecurityConfig.createList(roleList.toArray(new String[] {}));
            }
        }
        return null;

    }

    @Override
    public Collection<ConfigAttribute> getAllConfigAttributes() {
        return null;
    }

    @Override
    public boolean supports(Class<?> clazz) {
        return FilterInvocation.class.isAssignableFrom(clazz);

    }

}
