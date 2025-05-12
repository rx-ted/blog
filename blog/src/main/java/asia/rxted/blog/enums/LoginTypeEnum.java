package asia.rxted.blog.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum LoginTypeEnum {

    PHONE(1, "电话登录", "loginStrategyImpl"),
    EMAIL(2, "邮箱登录", "loginStrategyImpl");

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
