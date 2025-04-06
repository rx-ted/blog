package asia.rxted.blog.config.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum LoginTypeEnum {

    PHONE(1, "电话登录", "phoneLoginStrategyImpl"),
    EMAIL(2, "邮箱登录", "emailLoginStrategyImpl"),
    EMAIL_CODE(3, "邮箱验证码登录", "emailCodeLoginStrategyImpl"),
    PHONE_CODE(4, "手机验证码登录", "phoneCOdeLoginStrategyImpl");

    private final Integer type;

    private final String desc;

    private final String strategy;

    public static LoginTypeEnum findObjectByType(Integer type) {
        for (LoginTypeEnum loginType : LoginTypeEnum.values()) {
            if (loginType.getType().equals(type)) {
                return loginType;
            }
        }
        throw new IllegalArgumentException("No matching LoginTypeEnum for type: " + type);
    }

}
