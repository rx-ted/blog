package asia.rxted.blog.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;

import io.swagger.v3.oas.annotations.media.Schema;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "用户账号")
public class EmailLogin1VO {

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    @Schema(name = "username", title = "用户名", required = true, type = "String")
    private String username;

    @NotBlank(message = "验证码不能为空")
    @Schema(name = "code", title = "邮箱验证码", required = true, type = "String")
    private String code;
}