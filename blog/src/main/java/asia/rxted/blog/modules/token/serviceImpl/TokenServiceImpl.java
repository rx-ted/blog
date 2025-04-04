package asia.rxted.blog.modules.token.serviceImpl;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import asia.rxted.blog.model.dto.UserDetailsDTO;
import asia.rxted.blog.config.constant.AuthConstant;
import asia.rxted.blog.config.constant.RedisConstant;
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
    public String createToken(UserDetailsDTO userDetailsDTO) {
        refreshToken(userDetailsDTO);
        String userId = userDetailsDTO.getId().toString();
        return jwtConfig.createToken(userId);
    }

    @Override
    public void refreshToken(UserDetailsDTO userDetailsDTO) {
        LocalDateTime currentTime = LocalDateTime.now();
        userDetailsDTO.setExpireTime(currentTime.plusSeconds(AuthConstant.EXPIRE_TIME));
        String userId = userDetailsDTO.getId().toString();
        redisService.hSet(RedisConstant.LOGIN_USER, userId, userDetailsDTO, AuthConstant.EXPIRE_TIME);
    }

    @Override
    public void renewToken(UserDetailsDTO userDetailsDTO) {
        LocalDateTime expireTime = userDetailsDTO.getExpireTime();
        LocalDateTime currentTime = LocalDateTime.now();
        if (Duration.between(currentTime, expireTime).toMinutes() <= AuthConstant.TWENTY_MINUTES) {
            refreshToken(userDetailsDTO);
        }
    }

    @Override
    public UserDetailsDTO getUserDetailDTO(HttpServletRequest request) {
        String token = Optional.ofNullable(request.getHeader(AuthConstant.TOKEN_HEADER)).orElse("")
                .replaceFirst(AuthConstant.TOKEN_PREFIX, "");
        if (StringUtils.hasText(token) && !token.equals("null")) {
            String userId = jwtConfig.getUserIdFromToken(token);
            return (UserDetailsDTO) redisService.hGet(RedisConstant.LOGIN_USER, userId);
        }
        return null;
    }

    @Override
    public void delLoginUser(Integer userId) {
        redisService.hDel(RedisConstant.LOGIN_USER, String.valueOf(userId));

    }

    @Override
    public Boolean validateToken(String token) {
        return jwtConfig.getTokenClaim(token) != null;
    }

}
