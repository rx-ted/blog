package asia.rxted.blog.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum FileUploadEnum {
    LOCAL(0, "保存本地", ""),
    MYSQL(1, "保存mysql", "");

    private final Integer type;
    private final String description;
    private final String strategy;

}
