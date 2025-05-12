package asia.rxted.blog.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum EmailSendTypeEnum {
    CODE(1, "发送验证码"),
    TEXT(2, "发送文本"),
    HTML(3, "发送HTML"),
    SUBSCRIBE(4, "订阅主题");

    Integer code;
    String desc;

}
