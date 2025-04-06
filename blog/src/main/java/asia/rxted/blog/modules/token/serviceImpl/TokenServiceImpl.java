package asia.rxted.blog.modules.token.serviceImpl;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import asia.rxted.blog.model.dto.UserDetailsDTO;
import asia.rxted.blog.modules.cache.CachePrefix;
import asia.rxted.blog.modules.cache.service.RedisService;
import asia.rxted.blog.modules.token.config.JwtConfig;
import asia.rxted.blog.modules.token.service.TokenService;
import jakarta.servlet.http.HttpServletRequest;

@Service
public class TokenServiceImpl implements TokenService {
    /*
     * find resource data, i.e. https://www.cnblogs.com/java-note/p/18787761
     */
    @Autowired
    private JwtConfig jwtConfig;

    @Autowired
    private RedisService redisService;

    @Override
    public String createToken(String subject) {
        return jwtConfig.createToken(subject);
    }

    @Override
    public String createToken(UserDetailsDTO userDetailsDTO) {
        refreshToken(userDetailsDTO);
        String username = userDetailsDTO.getUsername();
        return createToken(username);
    }

    @Override
    public void refreshToken(UserDetailsDTO userDetailsDTO) {
        LocalDateTime currentTime = LocalDateTime.now();
        userDetailsDTO.setExpireTime(currentTime.plusSeconds(jwtConfig.getExpire()));
        String username = userDetailsDTO.getUsername();
        redisService.hSet(CachePrefix.LOGIN_USER.name(), username, userDetailsDTO, jwtConfig.getExpire());
    }

    @Override
    public void renewToken(UserDetailsDTO userDetailsDTO) {
        LocalDateTime expireTime = userDetailsDTO.getExpireTime();
        LocalDateTime currentTime = LocalDateTime.now();
        if (Duration.between(currentTime, expireTime).toMinutes() <= jwtConfig.getWait()) {
            refreshToken(userDetailsDTO);
        }
    }

    @Override
    public UserDetailsDTO getUserDetailDTO(HttpServletRequest request) {
        String token = Optional.ofNullable(request.getHeader(jwtConfig.getHeader())).orElse("")
                .replaceFirst(jwtConfig.getPrefix(), "");
        if (StringUtils.hasText(token) && !token.equals("null")) {
            String useraname = jwtConfig.getUserNameFromToken(token);
            return (UserDetailsDTO) redisService.hGet(
                    CachePrefix.LOGIN_USER.name(), useraname);
        }
        return null;
    }

    @Override
    public void delLoginUser(String username) {
        redisService.hDel(CachePrefix.LOGIN_USER.name(), username);

    }

    @Override
    public Boolean validateToken(String token) {
        return jwtConfig.getTokenClaim(token) != null;
    }

}
