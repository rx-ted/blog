package asia.rxted.blog.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebsiteHomeInfoDTO {

    private Long articleCount;

    private Long talkCount;

    private Long categoryCount;

    private Long tagCount;

    private WebsiteConfigDTO websiteConfigDTO;

    private Integer viewCount;

}
