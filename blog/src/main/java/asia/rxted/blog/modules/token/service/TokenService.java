package asia.rxted.blog.modules.token.service;

import org.springframework.security.core.userdetails.UserDetails;

import asia.rxted.blog.model.dto.UserDetailsDTO;

public interface TokenService {

    String createToken(UserDetailsDTO userDetails);

    boolean isTokenValid(String token, UserDetails userDetails);

    void delLoginUser(String username);

    String extractUserName(String token);

}
