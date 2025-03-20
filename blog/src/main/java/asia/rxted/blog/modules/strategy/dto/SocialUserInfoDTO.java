package asia.rxted.blog.modules.strategy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class SocialUserInfoDTO {

    private String nickname;

    private String avatar;

}
