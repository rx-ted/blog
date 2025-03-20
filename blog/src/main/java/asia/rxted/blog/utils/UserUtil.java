package asia.rxted.blog.utils;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import asia.rxted.blog.model.dto.UserDetailsDTO;


@Component
public class UserUtil {

    public static UserDetailsDTO getUserDetailsDTO() {
        return (UserDetailsDTO) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    public static Authentication getAuthentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

}
