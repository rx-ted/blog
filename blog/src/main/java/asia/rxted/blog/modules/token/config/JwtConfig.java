package asia.rxted.blog.modules.token.config;

import java.security.Key;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.Getter;
import lombok.Setter;

@Component
@ConfigurationProperties(prefix = "jwt")
@Getter
@Setter
public class JwtConfig {

    private String secret;
    private Long expire;
    private String header;
    private String prefix;
    private Integer wait;

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
                .setIssuedAt(nowDate)
                .setExpiration(expireDate)
                .compact();
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
