package asia.rxted.blog.modules.strategy;

import asia.rxted.blog.modules.strategy.dto.UserInfoDTO;

public interface SocialLoginStrategy {

    UserInfoDTO login(String data);

}
