package asia.rxted.blog.model.vo;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

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
public class PhoneLoginVO {
    @NotBlank(message = "电话号不能为空")
    @Schema(name = "phone", title = "电话号码", required = true, type = "String")
    private String phone;

    @Size(min = 6, message = "密码不能少于6位")
    @NotBlank(message = "密码不能为空")
    @Schema(name = "password", title = "密码", required = true, type = "String")
    private String password;

}
