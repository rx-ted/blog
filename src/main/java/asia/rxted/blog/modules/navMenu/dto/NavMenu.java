package asia.rxted.blog.modules.navMenu.dto;

import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;

@Data
@TableName(value = "NavMenus")
public class NavMenu {
    // Data Transfer Objects
    private Integer id;
    private Integer parent_id;
    private String name;
    private String url;
    private Integer grade;
    private Integer sort;
}
