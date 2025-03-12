package asia.rxted.blog.modules.user.dto;

import java.util.Date;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@TableName(value = "Users")
public class User {
    @Schema(description = "User Id")
    private Integer id;

    /*
     * @ unique user name
     */
    @Schema(description = "User Name")
    private String username;

    @Schema(description = "Nick Name")
    private String nick_name;

    /*
     * @ unique phone number
     */
    @Schema(description = "User Phone Number")
    private String phone;

    @Schema(description = "User Avatar")
    private String avatar = "";

    @Schema(description = "User Email")
    private String email;

    @Schema(description = "User Password")
    private String password;

    @Schema(description = "是否是超级管理员 超级管理员/普通管理员")
    private boolean is_super = false;

    @Schema(description = "状态 默认true正常 false禁用")
    private Boolean status = true;

    @Schema(description = "User role")
    private String role;

    @Schema(description = "描述/详情/备注")
    private String description;

    @Schema(description = "创建令牌")
    private String access_token;

    @Schema(description = "刷新令牌")
    private String refresh_token;

    // !================

    @Schema(description = "User create at")
    @TableField(fill = FieldFill.INSERT)
    private Date createdAt; // TODO(ben): Why does not use underscore case

    @Schema(description = "User updated at")
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private Date updateAt;

    // * more 字段

}
