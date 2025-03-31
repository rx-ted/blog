package asia.rxted.blog.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor

public class SiteBackInfoDTO {

    private Integer viewsCount;

    private Integer messageCount;

    private Integer userCount;

    private Integer articleCount;

    private List<CategoryDTO> categoryDTOList;

    private List<TagDTO> tagDTOList;

    private List<ArticleStatisticsDTO> articleStatisticsList;

    private List<UniqueViewDTO> uniqueViewDTOList;

    private List<ArticleRankDTO> articleRankDTOList;

}
