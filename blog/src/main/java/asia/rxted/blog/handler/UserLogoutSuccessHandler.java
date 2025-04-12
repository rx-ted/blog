package asia.rxted.blog.handler;

import java.io.IOException;
import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.stereotype.Component;

import com.baomidou.mybatisplus.core.toolkit.StringUtils;

import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.modules.cache.CachePrefix;
import asia.rxted.blog.modules.cache.service.RedisService;
import asia.rxted.blog.modules.token.service.TokenService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class UserLogoutSuccessHandler implements LogoutSuccessHandler {

    @Autowired
    private TokenService tokenService;
    @Autowired
    private RedisService redisService;

    @Override
    public void onLogoutSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException, ServletException {
        String token = request.getHeader("Authorization");
        if (!StringUtils.isBlank(token)) {
            token = token.substring(7);
            redisService.hSet(CachePrefix.BLACK_LIST.name(), token, LocalDateTime.now());
            log.info("用户{}登出成功，Token信息已保存到Redis的黑名单中", tokenService.extractUserName(token));

        }
        SecurityContextHolder.clearContext();
        ResultVO.success();
    }

}
