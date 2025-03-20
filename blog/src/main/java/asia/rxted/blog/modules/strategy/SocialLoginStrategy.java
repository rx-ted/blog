package asia.rxted.blog.modules.strategy;

import asia.rxted.blog.model.dto.UserInfoDTO;

public interface SocialLoginStrategy {

    UserInfoDTO login(String data);

}
