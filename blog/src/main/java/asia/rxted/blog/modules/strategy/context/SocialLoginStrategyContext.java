package asia.rxted.blog.modules.strategy.context;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import asia.rxted.blog.modules.strategy.SocialLoginStrategy;
import asia.rxted.blog.modules.strategy.config.LoginTypeEnum;
import asia.rxted.blog.modules.strategy.dto.UserInfoDTO;

import java.util.Map;

@Service
public class SocialLoginStrategyContext {

    @Autowired
    private Map<String, SocialLoginStrategy> socialLoginStrategyMap;

    public UserInfoDTO executeLoginStrategy(String data, LoginTypeEnum loginTypeEnum) {
        return socialLoginStrategyMap.get(loginTypeEnum.getStrategy()).login(data);
    }

}
