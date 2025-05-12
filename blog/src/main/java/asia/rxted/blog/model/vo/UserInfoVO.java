package asia.rxted.blog.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;

import io.swagger.v3.oas.annotations.media.Schema;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(name = "用户信息对象")
public class UserInfoVO {

    @NotBlank(message = "昵称不能为空")
    @Schema(name = "nickname", description = "昵称", type = "String")
    private String nickname;

    @Schema(name = "intro", description = "介绍", type = "String")
    private String intro;

    @Schema(name = "webSite", description = "个人网站", type = "String")
    private String website;

}
