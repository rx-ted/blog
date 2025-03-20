package asia.rxted.blog.modules.token.serviceImpl;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.google.gson.Gson;

import asia.rxted.blog.config.enums.SecurityEnum;
import asia.rxted.blog.config.enums.UserRoleEnum;
import asia.rxted.blog.model.dto.UserDetailsDTO;
import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultUtil;
import asia.rxted.blog.config.ServiceException;
import asia.rxted.blog.config.base.SecretKeyUtil;
import asia.rxted.blog.config.constant.AuthConstant;
import asia.rxted.blog.config.constant.RedisConstant;
import asia.rxted.blog.modules.cache.CachePrefix;
import asia.rxted.blog.modules.cache.RedisCache;
import asia.rxted.blog.modules.cache.service.RedisService;
import asia.rxted.blog.modules.token.config.Token;
import asia.rxted.blog.modules.token.service.TokenService;
import asia.rxted.blog.modules.user.config.AuthUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import jakarta.servlet.http.HttpServletRequest;

@Service
public class TokenServiceImpl implements TokenService {
    // @Value("${jwt.secret}")
    private String secret = "aurora";

    // * token默认过期时间
    private Long expirationTime = 60L;
    @Autowired
    private RedisCache cache;

    @Autowired
    private RedisService redisService;

    public Token createToken(AuthUser authUser) {
        Token token = new Token();

        String accessToken = createToken(authUser, expirationTime);

        redisService.set(CachePrefix.ACCESS_TOKEN.getPrefix(authUser.getId()) + accessToken, 1,
                expirationTime, TimeUnit.MINUTES);

        Long expireTime = authUser.getLongTerm() ? 15 * 24 * 60L : expirationTime * 2;
        String refreshToken = createToken(authUser, expireTime);
        redisService.set(CachePrefix.REFRESH_TOKEN.getPrefix(authUser.getId()) + refreshToken, 1,
                expireTime, TimeUnit.MINUTES);
        token.setAccessToken(accessToken);
        token.setRefreshToken(refreshToken);

        return token;
    }

    public Token refreshToken(String oldToken) {
        Claims claims = null;
        try {
            claims = Jwts.parser()
                    .setSigningKey(SecretKeyUtil.generalKeyByDecoders())
                    .build()
                    .parseClaimsJws(oldToken).getBody();
        } catch (Exception e) {
            ResultUtil.fail(ResultCode.USER_AUTH_EXPIRED);
        }
        String json = claims.get(SecurityEnum.USER_CONTEXT.getValue()).toString();
        AuthUser authUser = new Gson().fromJson(json, AuthUser.class);
        UserRoleEnum role = UserRoleEnum.fromRole(authUser.getRole());
        boolean longTerm = authUser.getLongTerm();

        if (redisService
                .hasKey(CachePrefix.REFRESH_TOKEN.getPrefix("_", role, authUser.getId(), oldToken))) {
            Token token = new Token();
            String accessToken = createToken(authUser, expirationTime);
            redisService.set(CachePrefix.ACCESS_TOKEN.getPrefix(authUser.getId()) + accessToken, 1,
                    expirationTime, TimeUnit.MINUTES);

            Long expiredTime = expirationTime * 2;
            if (longTerm) {
                expiredTime = 60 * 24 * 15L;
                authUser.setLongTerm(true);
            }
            String refreshToken = createToken(authUser, expiredTime);
            redisService.set(CachePrefix.REFRESH_TOKEN.getPrefix(authUser.getId()) + refreshToken, 1,
                    expiredTime, TimeUnit.MINUTES);
            token.setAccessToken(accessToken);
            token.setRefreshToken(refreshToken);
            redisService.del(CachePrefix.REFRESH_TOKEN.getPrefix(role, authUser.getId()) + oldToken);
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

    public String getUuid() {
        return UUID.randomUUID().toString().replaceAll("-", "");
    }

    public SecretKey generalKey() {
        byte[] encodedKey = Base64.getDecoder().decode(secret);
        return new SecretKeySpec(encodedKey, 0, encodedKey.length, "AES");
    }

    @Override
    public String createToken(UserDetailsDTO userDetailsDTO) {
        refreshToken(userDetailsDTO);
        String userId = userDetailsDTO.getId().toString();
        return createToken(userId);
    }

    @Override
    public String createToken(String subject) {
        SignatureAlgorithm signatureAlgorithm = SignatureAlgorithm.HS256;
        SecretKey secretKey = generalKey();
        return Jwts.builder().setId(getUuid()).setSubject(subject)
                .setIssuer("huaweimian")
                .signWith(signatureAlgorithm, secretKey).compact();

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
    public Claims parseToken(String token) {
        SecretKey secretKey = generalKey();
        return ((JwtParser) Jwts.parser().setSigningKey(secretKey)).parseClaimsJws(token).getBody();
    }

    @Override
    public UserDetailsDTO getUserDetailDTO(HttpServletRequest request) {
        String token = Optional.ofNullable(request.getHeader(AuthConstant.TOKEN_HEADER)).orElse("")
                .replaceFirst(AuthConstant.TOKEN_PREFIX, "");
        if (StringUtils.hasText(token) && !token.equals("null")) {
            Claims claims = parseToken(token);
            String userId = claims.getSubject();
            return (UserDetailsDTO) redisService.hGet(RedisConstant.LOGIN_USER, userId);
        }
        return null;
    }

    @Override
    public void delLoginUser(Integer userId) {
        redisService.hDel(RedisConstant.LOGIN_USER, String.valueOf(userId));

    }

}
