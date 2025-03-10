package asia.rxted.blog.modules.article.dto;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@TableName(value = "Articles")
public class Article {
    @TableId(type = IdType.AUTO)
    @Schema(description = "Article Id")
    private Integer id;
    @Schema(description = "Article Is Original")
    private Boolean is_origin;
    @Schema(description = "Article Title")
    private String title;
    @Schema(description = "Article Author")
    private String author;
    @Schema(description = "Article Tags")
    private String tags;
    @Schema(description = "Article Content")
    private String content;
    @Schema(description = "Article Description")
    private String description;
}
