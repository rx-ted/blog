package asia.rxted.blog.model.dto;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailMsgDTO {
    private String email;
    private String subject;
    private Map<String, Object> commentMap;
    private String template;
}
