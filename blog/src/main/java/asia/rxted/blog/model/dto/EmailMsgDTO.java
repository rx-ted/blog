package asia.rxted.blog.model.dto;

import java.util.Map;

import cn.hutool.core.lang.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailMsgDTO {
    @Builder.Default
    private String id = UUID.randomUUID().toString();
    private String email;
    private String subject;
    // ! html format
    private Map<String, Object> commentMap;
    private String template;
    // ! text format
    private String content;
}
