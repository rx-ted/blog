package asia.rxted.blog.model.vo;

import javax.validation.constraints.NotBlank;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "用户电话信息")
public class PhoneLogin1VO {
    @NotBlank(message = "电话号不能为空")
    @Schema(name = "phone", title = "电话号码", required = true, type = "String")
    private String phone;

    @NotBlank(message = "验证码不能为空")
    @Schema(name = "code", title = "邮箱验证码", required = true, type = "String")
    private String code;
}
