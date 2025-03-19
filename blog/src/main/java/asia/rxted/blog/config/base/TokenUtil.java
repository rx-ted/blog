package asia.rxted.blog.config.base;

import java.util.Date;
import java.util.concurrent.TimeUnit;

import org.apache.catalina.security.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.google.gson.Gson;

import asia.rxted.blog.common.ResultCode;
import asia.rxted.blog.common.ServiceException;
import asia.rxted.blog.common.enums.SecurityEnum;
import asia.rxted.blog.modules.cache.CachePrefix;
import asia.rxted.blog.modules.cache.RedisCache;
import asia.rxted.blog.modules.user.config.AuthUser;
import asia.rxted.blog.modules.user.config.UserRoleEnum;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;

@Service
public class TokenUtil {
    // * token默认过期时间
    private Long expirationTime = 60L;
    @Autowired
    private RedisCache cache;

    public Token createToken(AuthUser authUser) {
        Token token = new Token();

        String accessToken = createToken(authUser, expirationTime);

        cache.put(CachePrefix.ACCESS_TOKEN.getPrefix(authUser.getId()) + accessToken, 1,
                expirationTime, TimeUnit.MINUTES);

        Long expireTime = authUser.getLongTerm() ? 15 * 24 * 60L : expirationTime * 2;
        String refreshToken = createToken(authUser, expireTime);

        cache.put(CachePrefix.REFRESH_TOKEN.getPrefix(authUser.getId()) + refreshToken, 1,
                expireTime, TimeUnit.MINUTES);

        token.setAccessToken(accessToken);
        token.setRefreshToken(refreshToken);

        return token;
    }

    public Token refreshToken(String oldToken) {
        Claims claims;
        try {
            claims = Jwts.parser()
                    .setSigningKey(SecretKeyUtil.generalKeyByDecoders())
                    .build()
                    .parseClaimsJws(oldToken).getBody();
        } catch (Exception e) {
            throw new ServiceException(ResultCode.USER_AUTH_EXPIRED);
        }
        String json = claims.get(SecurityEnum.USER_CONTEXT.getValue()).toString();
        AuthUser authUser = new Gson().fromJson(json, AuthUser.class);
        UserRoleEnum role = UserRoleEnum.fromRole(authUser.getRole());
        boolean longTerm = authUser.getLongTerm();
        if (cache.hasKey(CachePrefix.REFRESH_TOKEN.getPrefix(role, authUser.getId()) + oldToken)) {
            Token token = new Token();
            String accessToken = createToken(authUser, expirationTime);
            cache.put(CachePrefix.ACCESS_TOKEN.getPrefix(authUser.getId()) + accessToken, 1,
                    expirationTime, TimeUnit.MINUTES);

            Long expiredTime = expirationTime * 2;
            if (longTerm) {
                expiredTime = 60 * 24 * 15L;
                authUser.setLongTerm(true);
            }
            String refreshToken = createToken(authUser, expiredTime);
            cache.put(CachePrefix.REFRESH_TOKEN.getPrefix(authUser.getId()) + refreshToken, 1,
                    expiredTime, TimeUnit.MINUTES);
            token.setAccessToken(accessToken);
            token.setRefreshToken(refreshToken);
            cache.remove(CachePrefix.REFRESH_TOKEN.getPrefix(role, authUser.getId()) + oldToken);
            return token;
        } else {
            throw new ServiceException(ResultCode.USER_AUTH_EXPIRED);
        }
    }

    private String createToken(AuthUser authUser, Long expirationTime) {
        String builder = Jwts.builder()
                .claim(SecurityEnum.USER_CONTEXT.getValue(),
                        new Gson().toJson(authUser))
                .setSubject(authUser.getUsername())
                .setExpiration(new Date(System.currentTimeMillis() + expirationTime * 60 * 1000))
                .signWith(SecretKeyUtil.generalKey()).compact();

        return builder;
    }

}
