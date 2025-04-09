package asia.rxted.blog.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

import io.swagger.v3.oas.annotations.media.Schema;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "用户账号")
public class LoginVO {

    @NotBlank(message = "用户名、邮箱或手机号不能为空")
    @Schema(name = "username", title = "用户名", required = true, type = "String")
    private String username;

    @Size(min = 6, message = "密码不能少于6位")
    @NotBlank(message = "密码不能为空")
    @Schema(name = "password", title = "密码", required = true, type = "String")
    private String password;

    @NotBlank(message = "验证码不能为空")
    @Schema(name = "code", title = "邮箱验证码", required = true, type = "String")
    private String code;

}