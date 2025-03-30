package asia.rxted.blog.config.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ArticleStatusEnum {

    PUBLIC(1, "公开"),
    SECRET(2, "密码"),
    PRIVATE(3, "私密"),
    DRAFT(4, "草稿");

    private final Integer status;

    private final String desc;

}
