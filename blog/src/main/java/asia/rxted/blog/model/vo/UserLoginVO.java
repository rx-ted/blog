package asia.rxted.blog.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Schema(description = "用户登录对象")
public class UserLoginVO {
    @NotNull(message = "登录类型不能为空")
    private Integer type;
    // !-------------------------------!//
    // select one only
    private PhoneLoginVO phoneLoginVO; // type=1
    private EmailLoginVO emailLoginVO; // type=2
    private EmailLogin1VO emailLogin1VO; // type=3
    private PhoneLoginVO phoneLogin1VO; // type=3
    // !-------------------------------!//

    public Object getLoginDetails() {
        if (type == null) {
            throw new IllegalArgumentException("登录类型不能为空");
        }
        return switch (type) {
            case 1 -> this.phoneLoginVO;
            case 2 -> this.emailLoginVO;
            case 3 -> this.emailLogin1VO;
            default -> throw new IllegalArgumentException("无效的登录类型: " + type);
        };
    }

}
