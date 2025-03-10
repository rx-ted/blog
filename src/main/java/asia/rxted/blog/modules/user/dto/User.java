package asia.rxted.blog.modules.user.dto;

import java.util.Date;

import org.hibernate.validator.constraints.Length;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@TableName(value = "Users")
public class User {
    @Schema(description= "User Id")
    private Integer id;

    @Schema(description= "User Name")
    @Length(max = 20, message = "user name length less then 20 characters")
    private String username;

    @Schema(description= "Nick Name")
    @Length(max = 10, message = "nick name length cannot exceed 10 characters")
    private String nick_name;

    @Schema(description= "User Phone Number")
    @Length(max = 11, message = "The length of the phone number cannot exceed 11")
    private String phone;

    @Schema(description= "User Avatar")
    private String avatar = "";

    @Schema(description= "User Email")
    @Length(max = 100, message = "user email length cannot exceed 100 characters")
    private String email;

    @Schema(description= "User Password")
    private String password;

    @Schema(description= "是否是超级管理员 超级管理员/普通管理员")
    private boolean is_super = false;

    @Schema(description= "状态 默认true正常 false禁用")
    private Boolean status = true;

    @Schema(description= "User role")
    private Integer role;

    @Schema(description= "描述/详情/备注")
    private String description;

    // !================

    @Schema(description= "User create at")
    @TableField(fill = FieldFill.INSERT)
    private Date createdAt; // TODO(ben): Why does not use underscore case

    @Schema(description= "User updated at")
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private Date updateAt;

    // * more 字段

}
