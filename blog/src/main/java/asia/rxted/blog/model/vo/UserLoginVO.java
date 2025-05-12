package asia.rxted.blog.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Schema(description = "用户登录对象")
public class UserLoginVO {
    @NotNull(message = "登录类型不能为空")
    // Refer to `LoginTypeEnum` for more information
    private Integer type;
    private LoginVO loginVO;

}
