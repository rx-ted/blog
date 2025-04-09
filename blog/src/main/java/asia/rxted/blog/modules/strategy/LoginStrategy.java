package asia.rxted.blog.modules.strategy;

import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.model.dto.UserInfoDTO;

public interface LoginStrategy {

    ResultMessage<UserInfoDTO> login(String data, Integer loginType);

}
