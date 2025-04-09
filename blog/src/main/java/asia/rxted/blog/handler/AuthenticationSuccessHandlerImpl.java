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
        UserAuth userAuth = UserAuth.builder()
                .id(UserUtil.getUserDetailsDTO().getId())
                .ipAddress(UserUtil.getUserDetailsDTO().getIpAddress())
                .ipSource(UserUtil.getUserDetailsDTO().getIpSource())
                .lastLoginTime(UserUtil.getUserDetailsDTO().getLastLoginTime())
                .build();
        userAuthMapper.updateById(userAuth);
    }

}
