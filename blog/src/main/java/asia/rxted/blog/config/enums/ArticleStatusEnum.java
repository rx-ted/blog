package asia.rxted.blog.config.enums;

import lombok.AllArgsConstructor;

@AllArgsConstructor
public enum ArticleStatusEnum {

    PUBLIC(1, "公开"),
    SECRET(2, "密码"),
    PRIVATE(3, "私密"),
    DRAFT(4, "草稿");

    private final Integer code;

    private final String desc;

    public Integer code() {
        return this.code;
    }

    public String desc() {
        return this.desc;
    }

}
