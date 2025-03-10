package asia.rxted.blog.modules.user.config;

import org.hibernate.validator.constraints.Length;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class UserRegister {
    @Schema(description = "User Id")
    private Integer id;

    @Schema(description = "User Name")
    @Length(max = 20, message = "user name length less then 20 characters")
    private String username;

    @Schema(description = "User Password")
    private String password;

    @Schema(description = "Nick Name")
    @Length(max = 10, message = "nick name length cannot exceed 10 characters")
    private String nick_name;

    @Schema(description = "User Phone Number")
    @Length(max = 11, message = "The length of the phone number cannot exceed 11")
    private String phone;

    @Schema(description = "User Avatar")
    private String avatar = "";

    @Schema(description = "User Email")
    @Length(max = 100, message = "user email length cannot exceed 100 characters")
    private String email;

}
