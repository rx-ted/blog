package asia.rxted.blog.handler;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

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
            throw new UsernameNotFoundException("用户名不存在");
        }

        if (!new BCryptPasswordEncoder().matches(password, userDetailsDTO.getPassword())) {
            throw new BadCredentialsException("用户名或密码错误");
        }

        if (userDetailsDTO.getIsDisable().equals(1)) {
            throw new LockedException("用户已禁用");
        }

        return new UsernamePasswordAuthenticationToken(userDetailsDTO, password, userDetailsDTO.getAuthorities());

    }

    @Override
    public boolean supports(Class<?> authentication) {
        return true;
    }

}
