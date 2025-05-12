package asia.rxted.blog.model.entity;

import java.time.LocalDateTime;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@TableName("t_file")

public class File {

    @TableId(type = IdType.AUTO)
    private Long id;

    // 名称
    private String name;

    // 文件大小
    private Long size;

    // 扩展名
    private String type;

    // 描述（可以为空）
    private String description;

    // 存在本地的地址
    private String path;

    // 生成md5
    private String md5;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.UPDATE)
    private LocalDateTime updateTime;
}
