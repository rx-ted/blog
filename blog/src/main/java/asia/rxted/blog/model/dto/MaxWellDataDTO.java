package asia.rxted.blog.model.dto;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * {
 * "database":"",
 * "table":"",
 * "type":"",
 * "ts":1743047082,
 * "xid":468,
 * "commit":true,
 * "data":{},
 * "old":{}
 * }
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaxWellDataDTO {
    private String database;
    private String table;
    private String type;
    private Integer ts;
    private Integer xid;
    private Boolean commit;
    private Map<String, Object> data;
    private Map<String, Object> old;
}
