package asia.rxted.blog.modules.user.config;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class UserRegister {
    @Schema(description = "User Id")
    private Integer id;

    @Schema(description = "User Name")
    private String username;

    @Schema(description = "User Password")
    private String password;

    @Schema(description = "Nick Name")
    private String nick_name;

    @Schema(description = "User Phone Number")
    private String phone;

    @Schema(description = "User Avatar")
    private String avatar = "";

    @Schema(description = "User Email")
    private String email;

}
