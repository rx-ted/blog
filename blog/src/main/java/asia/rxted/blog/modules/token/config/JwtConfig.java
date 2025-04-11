package asia.rxted.blog.modules.token.config;

import java.security.Key;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.TypeReference;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;

import asia.rxted.blog.model.dto.UserDetailsDTO;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;

@Component
@ConfigurationProperties(prefix = "jwt")
@Getter
@Setter
@Slf4j
public class JwtConfig {

    private String secret;
    private Long expire;
    private String header;
    private String prefix;
    private Integer wait;
    private String antMatchers;

    public String createToken(String subject) {
        Date nowDate = new Date();
        Date expireDate = new Date(nowDate.getTime() + expire * 1000);
        String uuid = getUuid();
        Key key = generalKey();
        return Jwts.builder()
                .setHeaderParam("typ", "JWT")
                .setId(uuid)
                .signWith(key)
                .setSubject(subject)
                .setIssuer("C3Stones")
                .setIssuedAt(nowDate)
                .setExpiration(expireDate)
                .compact();
    }

    public String createToken(UserDetailsDTO userDetailsDTO) {

        Date nowDate = new Date();
        Date expireDate = new Date(nowDate.getTime() + expire * 1000);
        String token = Jwts.builder()
                .setHeaderParam("typ", "JWT")
                .setId(userDetailsDTO.getId().toString())
                .signWith(SignatureAlgorithm.HS512, secret)
                .setSubject(userDetailsDTO.getUsername())
                .setIssuer("C3Stones")
                .setIssuedAt(nowDate)
                .setExpiration(expireDate)
                .claim("authorities", JSON.toJSONString(userDetailsDTO.getAuthorities()))
                .compact();
        return prefix + token;
    }

    public UserDetailsDTO parseAccessToken(String token) {
        UserDetailsDTO userDetailsDTO = null;
        if (StringUtils.isNotEmpty(token)) {
            try {
                // 去除JWT前缀
                token = token.substring(prefix.length());

                // 解析Token
                Claims claims = Jwts.parser().setSigningKey(secret).parseClaimsJws(token).getBody();

                // 获取用户信息
                userDetailsDTO = new UserDetailsDTO();
                userDetailsDTO.setId(Integer.parseInt(claims.getId()));
                userDetailsDTO.setUsername(claims.getSubject());
                // 获取角色
                Set<GrantedAuthority> authorities = new HashSet<GrantedAuthority>();
                String authority = claims.get("authorities").toString();
                if (StringUtils.isNotEmpty(authority)) {
                    List<Map<String, String>> authorityList = JSON.parseObject(authority,
                            new TypeReference<List<Map<String, String>>>() {
                            });

                    for (Map<String, String> role : authorityList) {
                        if (!role.isEmpty()) {
                            authorities.add(new SimpleGrantedAuthority(role.get("authority")));
                        }
                    }
                }
                userDetailsDTO.setAuthorities(authorities);
                System.out.println("authorities： " + authorities);
            } catch (Exception e) {
                log.error("解析Token异常：" + e);
            }
        }
        return userDetailsDTO;
    }

    public Claims getTokenClaim(String token) {
        try {
            Key key = generalKey();
            return Jwts.parser()
                    .setSigningKey(key)
                    .parseClaimsJwt(token)
                    .getBody();
        } catch (Exception e) {
            return null;
        }
    }

    public boolean isTokenExpired(Date expirationTime) {
        return expirationTime.before(new Date());
    }

    public Date getExpirationDateFromToken(String token) {
        return getTokenClaim(token).getExpiration();
    }

    public String getUserNameFromToken(String token) {
        return getTokenClaim(token).getSubject();
    }

    public Date getIssuedAtDateFromToken(String token) {
        return getTokenClaim(token).getIssuedAt();
    }

    public String getUuid() {
        return UUID.randomUUID().toString().replaceAll("-", "");
    }

    public SecretKey generalKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));

    }

}
