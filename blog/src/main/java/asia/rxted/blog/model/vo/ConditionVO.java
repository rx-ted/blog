package asia.rxted.blog.model.vo;

import java.time.LocalDateTime;

import org.springframework.format.annotation.DateTimeFormat;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "查询条件")
public class ConditionVO {

    @Schema(name = "current", title = "页码", type = "Long")
    private Long current;

    @Schema(name = "size", title = "条数", type = "Long")
    private Long size;

    @Schema(name = "keywords", title = "搜索内容", type = "String")
    private String keywords;

    @Schema(name = "categoryId", title = "分类id", type = "Integer")
    private Integer categoryId;

    @Schema(name = "tagId", title = "标签id", type = "Integer")
    private Integer tagId;

    @Schema(name = "albumId", title = "相册id", type = "Integer")
    private Integer albumId;

    @Schema(name = "loginType", title = "登录类型", type = "Integer")
    private Integer loginType;

    @Schema(name = "type", title = "类型", type = "Integer")
    private Integer type;

    @Schema(name = "status", title = "状态", type = "Integer")
    private Integer status;

    @Schema(name = "startTime", title = "开始时间", example = "2014-12-01 12:00:00", format = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;

    @Schema(name = "endTime", title = "结束时间", example = "2014-12-01 12:00:00", format = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;

    @Schema(name = "isDelete", title = "是否删除", type = "Integer")
    private Integer isDelete;

    @Schema(name = "isReview", title = "是否审核", type = "Integer")
    private Integer isReview;

    @Schema(name = "isTop", title = "是否置顶", type = "Integer")
    private Integer isTop;

    @Schema(name = "isFeatured", title = "是否推荐", type = "Integer")
    private Integer isFeatured;

}
