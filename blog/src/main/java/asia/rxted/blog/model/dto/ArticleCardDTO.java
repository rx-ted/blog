package asia.rxted.blog.model.dto;

import java.time.LocalDateTime;
import java.util.List;

import asia.rxted.blog.model.entity.Tag;
import asia.rxted.blog.modules.user.entity.UserInfo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleCardDTO {

    private Integer id;

    private String articleCover;

    private String articleTitle;

    private String articleContent;

    private Integer isTop;

    private Integer isFeatured;

    private UserInfo author;

    private String categoryName;

    private List<Tag> tags;

    private Integer status;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

}
