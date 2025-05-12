package asia.rxted.blog.modules.token.serviceImpl;

import java.security.Key;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import asia.rxted.blog.model.dto.UserDetailsDTO;
import asia.rxted.blog.modules.cache.CachePrefix;
import asia.rxted.blog.modules.cache.service.RedisService;
import asia.rxted.blog.modules.token.JwtConfig;
import asia.rxted.blog.modules.token.service.TokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class TokenServiceImpl implements TokenService {
    /*
     * find resource data, i.e. https://www.cnblogs.com/java-note/p/18787761
     */

    @Autowired
    private RedisService redisService;

    @Autowired
    private JwtConfig jwtConfig;

    @Override
    public String createToken(UserDetailsDTO userDetails) {
        return createToken(new HashMap<>(), userDetails);
    }

    private String createToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        String username = userDetails.getUsername();

        String token = Jwts.builder().setClaims(extraClaims).setSubject(username)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + jwtConfig.getExpiration() * 1000))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256).compact();
        redisService.hSet(CachePrefix.ACCESS_TOKEN.name(), username, token);
        return token;
    }

    @Override
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String userName = extractUserName(token);
        return (userName.equals(userDetails.getUsername())) && !isTokenExpired(token);

    }

    @Override
    public void delLoginUser(Integer id) {
        var token = redisService.hGet(CachePrefix.ACCESS_TOKEN.name(), id.toString());
        if (Objects.nonNull(token)) {
            redisService.hDel(CachePrefix.ACCESS_TOKEN.name(), id.toString());
            redisService.hSet(CachePrefix.BLACK_LIST.name(), token.toString(), LocalDateTime.now());
        }
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    @Override
    public String extractUserName(String token) {
        return extractClaim(token, Claims::getSubject);

    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolvers) {
        final Claims claims = extractAllClaims(token);
        return claimsResolvers.apply(claims);
    }

    private Key getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtConfig.getSecret());
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder().setSigningKey(getSigningKey()).build().parseClaimsJws(token)
                .getBody();
    }

}
