package asia.rxted.blog.handler;

import java.util.List;
import java.util.Objects;
import java.util.function.Supplier;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.CollectionUtils;

import asia.rxted.blog.mapper.RoleMapper;
import asia.rxted.blog.model.dto.ResourceRoleDTO;
import jakarta.annotation.PostConstruct;

@Component
public class UserAuthorizationManager implements AuthorizationManager<RequestAuthorizationContext> {

    @Autowired
    private RoleMapper roleMapper;

    private static List<ResourceRoleDTO> resourceRoleList;

    @PostConstruct
    private void loadResourceRoleList() {
        resourceRoleList = roleMapper.listResourceRoles();
    }

    public void clearDataSource() {
        resourceRoleList = null;
    }

    @Override
    public AuthorizationDecision check(Supplier<Authentication> authentication, RequestAuthorizationContext object) {
        if (CollectionUtils.isEmpty(resourceRoleList)) {
            this.loadResourceRoleList();
        }
        String method = object.getRequest().getMethod();
        String url = object.getRequest().getRequestURI();
        boolean granted = true;
        AntPathMatcher antPathMatcher = new AntPathMatcher();

        List<String> roleList = null;
        for (ResourceRoleDTO resourceRoleDTO : resourceRoleList) {
            if (antPathMatcher.match(resourceRoleDTO.getUrl(), url)
                    && resourceRoleDTO.getRequestMethod().equals(method)) {
                roleList = resourceRoleDTO.getRoleList();
                granted = false; // 需要authorization才可以访问
            }
            // 其他的默认允许访问
        }

        if (Boolean.FALSE.equals(granted) && Objects.nonNull(roleList)) {
            // TODO(Ben): need to verify authorization
        }

        return new AuthorizationDecision(true);
        // return new AuthorizationDecision(granted);
    }

}
