package asia.rxted.blog.modules.token.service;

import asia.rxted.blog.modules.article.dto.UserDetailsDTO;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;

public interface TokenService {

    String createToken(UserDetailsDTO userDetailsDTO);

    String createToken(String subject);

    void refreshToken(UserDetailsDTO userDetailsDTO);

    void renewToken(UserDetailsDTO userDetailsDTO);

    Claims parseToken(String token);

    UserDetailsDTO getUserDetailDTO(HttpServletRequest request);

    void delLoginUser(Integer userId);

}
