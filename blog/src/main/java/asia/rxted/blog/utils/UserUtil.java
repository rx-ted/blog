package asia.rxted.blog.utils;

import java.util.Objects;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import asia.rxted.blog.model.dto.UserDetailsDTO;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class UserUtil {

    public static Authentication getAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (Objects.nonNull(authentication) && authentication.isAuthenticated()) {
            return authentication;
        }
        log.error("Authentication is null or not authenticated");
        return null;
    }

    public static UserDetailsDTO getUserDetailsDTO() {
        Authentication authentication = getAuthentication();
        if (Objects.nonNull(authentication) && authentication.isAuthenticated()) {
            if (authentication.getPrincipal() instanceof UserDetailsDTO) {
                return (UserDetailsDTO) authentication.getPrincipal();
            }
        }
        throw new IllegalArgumentException("Authentication is null or not authenticated");
    }

}
