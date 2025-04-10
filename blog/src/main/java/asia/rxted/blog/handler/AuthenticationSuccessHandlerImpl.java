package asia.rxted.blog.handler;

import java.io.IOException;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.alibaba.fastjson.JSON;

import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.constant.CommonConstant;
import asia.rxted.blog.mapper.UserAuthMapper;
import asia.rxted.blog.model.dto.UserDetailsDTO;
import asia.rxted.blog.model.dto.UserInfoDTO;
import asia.rxted.blog.model.entity.UserAuth;
import asia.rxted.blog.modules.token.service.TokenService;
import asia.rxted.blog.utils.BeanCopyUtil;
import asia.rxted.blog.utils.UserUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class AuthenticationSuccessHandlerImpl implements AuthenticationSuccessHandler {

    @Autowired
    private UserAuthMapper userAuthMapper;
    @Autowired
    private TokenService tokenService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {
        Authentication localAuthentication = SecurityContextHolder.getContext().getAuthentication();
        if (Objects.isNull(localAuthentication.getPrincipal())) {
            return;
        }
        UserInfoDTO userInfoDTO = BeanCopyUtil.copyObject(localAuthentication.getPrincipal(), UserInfoDTO.class);
        if (Objects.nonNull(userInfoDTO)) {
            UserDetailsDTO userDetailsDTO = (UserDetailsDTO) authentication.getPrincipal();
            userInfoDTO.setToken(tokenService.createToken(userDetailsDTO));
        }
        response.setContentType(CommonConstant.APPLICATION_JSON);
        response.getWriter().write(JSON.toJSONString(ResultVO.data(userInfoDTO)));
        updateUserInfo();
    }

    @Async
    public void updateUserInfo() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication.getPrincipal() instanceof UserDetailsDTO)) {
            log.error("Principal is not of type UserDetailsDTO. Found: {}",
                    authentication.getPrincipal().getClass().getName());
            return;
        }
        UserDetailsDTO principal = (UserDetailsDTO) authentication.getPrincipal();

        UserAuth userAuth = UserAuth.builder()
                .id(principal.getId())
                .ipAddress(principal.getIpAddress())
                .ipSource(principal.getIpSource())
                .lastLoginTime(principal.getLastLoginTime())
                .build();
        userAuthMapper.updateById(userAuth);
    }

}
