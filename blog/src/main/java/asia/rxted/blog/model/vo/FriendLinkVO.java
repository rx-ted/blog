package asia.rxted.blog.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "友链")
public class FriendLinkVO {

    @Schema(name = "categoryId", description = "友链id", type = "Integer")
    private Integer id;

    @NotBlank(message = "链接名不能为空")
    @Schema(name = "linkName", description = "友链名", type = "String", required = true)
    private String linkName;

    @NotBlank(message = "链接头像不能为空")
    @Schema(name = "linkAvatar", description = "友链头像", type = "String", required = true)
    private String linkAvatar;

    @NotBlank(message = "链接地址不能为空")
    @Schema(name = "linkAddress", description = "友链头像", type = "String", required = true)
    private String linkAddress;

    @NotBlank(message = "链接介绍不能为空")
    @Schema(name = "linkIntro", description = "友链头像", type = "String", required = true)
    private String linkIntro;

}
