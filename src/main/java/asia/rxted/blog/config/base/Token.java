package asia.rxted.blog.config.base;

import lombok.Data;

@Data
public class Token {

    private String accessToken;
    private String refreshToken;

}
