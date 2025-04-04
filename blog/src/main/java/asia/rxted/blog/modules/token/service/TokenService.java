package asia.rxted.blog.modules.token.service;

import asia.rxted.blog.model.dto.UserDetailsDTO;
import jakarta.servlet.http.HttpServletRequest;

public interface TokenService {

    String createToken(UserDetailsDTO userDetailsDTO);

    Boolean validateToken(String token);

    void refreshToken(UserDetailsDTO userDetailsDTO);

    void renewToken(UserDetailsDTO userDetailsDTO);

    UserDetailsDTO getUserDetailDTO(HttpServletRequest request);

    void delLoginUser(Integer userId);

}
