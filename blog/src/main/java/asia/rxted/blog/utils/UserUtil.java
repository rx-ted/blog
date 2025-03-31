package asia.rxted.blog.utils;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import asia.rxted.blog.model.dto.UserDetailsDTO;

@Component
public class UserUtil {

    public static UserDetailsDTO getUserDetailsDTO() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return (UserDetailsDTO) authentication.getPrincipal();
    }

    public static Authentication getAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return authentication;
    }

}
