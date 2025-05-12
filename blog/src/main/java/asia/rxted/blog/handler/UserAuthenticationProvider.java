package asia.rxted.blog.handler;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import asia.rxted.blog.config.BizException;
import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.model.dto.UserDetailsDTO;
import asia.rxted.blog.modules.user.serviceImpl.UserDetailServiceImpl;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class UserAuthenticationProvider implements AuthenticationProvider {

    @Autowired
    private UserDetailServiceImpl userDetailService;

    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        log.info("UserAuthenticationProvider authenticate: " + authentication.toString());

        String username = (String) authentication.getPrincipal(); // 获取用户名
        String password = (String) authentication.getCredentials(); // 获取密码

        UserDetailsDTO userDetailsDTO = (UserDetailsDTO) userDetailService.loadUserByUsername(username);
        if (userDetailsDTO == null) {
            throw new BizException(ResultCode.USER_NOT_EXIST);
        }

        if (!new BCryptPasswordEncoder().matches(password, userDetailsDTO.getPassword())) {
            throw new BizException(ResultCode.USER_PASSWORD_ERROR);
        }

        if (userDetailsDTO.getIsDisable().equals(1)) {
            throw new BizException(ResultCode.USER_IS_LOCKED);
        }

        return new UsernamePasswordAuthenticationToken(userDetailsDTO, password, userDetailsDTO.getAuthorities());

    }

    @Override
    public boolean supports(Class<?> authentication) {
        return true;
    }

}
