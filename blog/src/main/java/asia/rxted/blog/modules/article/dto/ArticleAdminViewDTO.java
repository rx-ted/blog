package asia.rxted.blog.modules.article.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author rx-ted
 *         文章编辑页码DTO
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "文章")
public class ArticleAdminViewDTO {

    private Integer id;

    private String articleTitle;

    private String articleAbstract;

    private String articleContent;

    private String articleCover;

    private String categoryName;

    private List<String> tagNames;

    private Integer isTop;

    private Integer isFeatured;

    private Integer status;

    private Integer type;

    private String originalUrl;

    private String password;

}
