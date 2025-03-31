package asia.rxted.blog.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

import io.swagger.v3.oas.annotations.media.Schema;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "评论")
public class CommentVO {

    @Schema(name = "replyUserId", title = "回复用户id", type = "Integer")
    private Integer replyUserId;

    @Schema(name = "topicId", title = "主题id", type = "Integer")
    private Integer topicId;

    @NotBlank(message = "评论内容不能为空")
    @Schema(name = "commentContent", title = "评论内容", required = true, type = "String")
    private String commentContent;

    @Schema(name = "parentId", title = "评论父id", type = "Integer")
    private Integer parentId;

    @NotNull(message = "评论类型不能为空")
    @Schema(name = "type", title = "评论类型", type = "Integer")
    private Integer type;
}
