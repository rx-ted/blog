package asia.rxted.blog.config.base;

import javax.crypto.SecretKey;

import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.apache.commons.codec.binary.Base64;;

public class SecretKeyUtil {
    private static String key = "cuAihCz53DZRjZwbsGcZJ2Ai6At+T142uphtJMsk7iQ=";

    public static SecretKey generalKey() {

        // 自定义
        byte[] encodedKey = Base64.decodeBase64(key.getBytes());
        SecretKey key = Keys.hmacShaKeyFor(encodedKey);
        return key;
    }

    public static SecretKey generalKeyByDecoders() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(key));

    }
}
