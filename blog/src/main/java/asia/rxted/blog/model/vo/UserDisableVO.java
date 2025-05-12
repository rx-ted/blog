package asia.rxted.blog.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotNull;

import io.swagger.v3.oas.annotations.media.Schema;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Schema(name = "用户禁用状态")
public class UserDisableVO {

    @NotNull(message = "用户id不能为空")
    private Integer id;

    @NotNull(message = "用户禁用状态不能为空")
    private Integer isDisable;

}
