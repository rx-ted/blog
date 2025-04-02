package asia.rxted.blog.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Builder
@AllArgsConstructor
public class SearchDTO {
    private String id;
    private String title;
    private String content;
    private Integer isDelete;
    private Integer status;
}
