package asia.rxted.blog.modules.article.dto;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@TableName(value = "Articles")
@Schema(name = "Articles", description = "$!{table.comment}")
public class Article {
    @TableId(type = IdType.AUTO)
    @Schema(description = "Article Id")
    private Integer id;
    // @ApiModelProperty(value = "Article Is Original")
    private Boolean is_origin;
    // @ApiModelProperty(value = "Article Title")
    private String title;
    // @ApiModelProperty(value = "Article Author")
    private String author;
    // @ApiModelProperty(value = "Article Tags")
    private String tags;
    // @ApiModelProperty(value = "Article Content")
    private String content;
    // @ApiModelProperty(value = "Article Description")
    private String description;
}
