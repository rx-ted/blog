package asia.rxted.blog.modules.strategy;

import asia.rxted.blog.model.dto.UserInfoDTO;

public interface LoginStrategy {

    UserInfoDTO login(String data, Integer loginType);

}
