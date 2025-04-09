package asia.rxted.blog.modules.strategy.context;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.enums.LoginTypeEnum;
import asia.rxted.blog.model.dto.UserInfoDTO;
import asia.rxted.blog.modules.strategy.LoginStrategy;

@Service
public class LoginStrategyContext {
    @Autowired
    private Map<String, LoginStrategy> loginStrategyMap;

    public ResultMessage<UserInfoDTO> executeLoginStrategy(String data, LoginTypeEnum loginTypeEnum) {
        return loginStrategyMap.get(loginTypeEnum.getStrategy()).login(data, loginTypeEnum.getType());
    }

}
