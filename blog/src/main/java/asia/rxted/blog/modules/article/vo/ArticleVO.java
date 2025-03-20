package asia.rxted.blog.modules.article.vo;

import javax.validation.constraints.NotBlank;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "文章")
public class ArticleVO {

    @Schema(name = "id", title = "文章id", type = "Integer")
    private Integer id;

    @NotBlank(message = "文章标题不能为空")
    @Schema(name = "articleTitle", title = "文章标题", required = true, type = "String")
    private String articleTitle;

    @NotBlank(message = "文章内容不能为空")
    @Schema(name = "articleContent", title = "文章内容", required = true, type = "String")
    private String articleContent;

    @Schema(name = "articleAbstract", title = "文章摘要", type = "String")
    private String articleAbstract;

    @Schema(name = "articleCover", title = "文章缩略图", type = "String")
    private String articleCover;

    @Schema(name = "category", title = "文章分类", type = "Integer")
    private String categoryName;

    @Schema(name = "tagNameList", title = "文章标签", type = "List<Integer>")
    private List<String> tagNames;

    @Schema(name = "isTop", title = "是否置顶", type = "Integer")
    private Integer isTop;

    @Schema(name = "isFeatured", title = "是否推荐", type = "Integer")
    private Integer isFeatured;

    @Schema(name = "status", title = "文章状态", type = "String")
    private Integer status;

    @Schema(name = "type", title = "文章类型", type = "Integer")
    private Integer type;

    @Schema(name = "originalUrl", title = "原文链接", type = "String")
    private String originalUrl;

    @Schema(name = "password", title = "文章访问密码", type = "String")
    private String password;
}
