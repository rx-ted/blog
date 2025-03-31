package asia.rxted.blog.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Schema(description = "网站配置")
public class WebsiteConfigVO {

    @Schema(name = "name", title = "网站名称", required = true, type = "String")
    private String name;

    @Schema(name = "nickName", title = "网站作者昵称", required = true, type = "String")
    private String englishName;

    @Schema(name = "author", title = "网站作者", required = true, type = "String")
    private String author;

    @Schema(name = "avatar", title = "网站头像", required = true, type = "String")
    private String authorAvatar;

    @Schema(name = "description", title = "网站作者介绍", required = true, type = "String")
    private String authorIntro;

    @Schema(name = "logo", title = "网站logo", required = true, type = "String")
    private String logo;

    @Schema(name = "multiLanguage", title = "多语言", required = true, type = "Integer")
    private Integer multiLanguage;

    @Schema(name = "notice", title = "网站公告", required = true, type = "String")
    private String notice;

    @Schema(name = "websiteCreateTime", title = "网站创建时间", required = true, type = "LocalDateTime")
    private String websiteCreateTime;

    @Schema(name = "beianNumber", title = "网站备案号", required = true, type = "String")
    private String beianNumber;

    @Schema(name = "qqLogin", title = "QQ登录", required = true, type = "Integer")
    private Integer qqLogin;

    @Schema(name = "github", title = "github", required = true, type = "String")
    private String github;

    @Schema(name = "gitee", title = "gitee", required = true, type = "String")
    private String gitee;

    @Schema(name = "qq", title = "qq", required = true, type = "String")
    private String qq;

    @Schema(name = "weChat", title = "微信", required = true, type = "String")
    private String weChat;

    @Schema(name = "weibo", title = "微博", required = true, type = "String")
    private String weibo;

    @Schema(name = "csdn", title = "csdn", required = true, type = "String")
    private String csdn;

    @Schema(name = "zhihu", title = "zhihu", required = true, type = "String")
    private String zhihu;

    @Schema(name = "juejin", title = "juejin", required = true, type = "String")
    private String juejin;

    @Schema(name = "twitter", title = "twitter", required = true, type = "String")
    private String twitter;

    @Schema(name = "stackoverflow", title = "stackoverflow", required = true, type = "String")
    private String stackoverflow;

    @Schema(name = "touristAvatar", title = "游客头像", required = true, type = "String")
    private String touristAvatar;

    @Schema(name = "userAvatar", title = "用户头像", required = true, type = "String")
    private String userAvatar;

    @Schema(name = "isCommentReview", title = "是否评论审核", required = true, type = "Integer")
    private Integer isCommentReview;

    @Schema(name = "isEmailNotice", title = "是否邮箱通知", required = true, type = "Integer")
    private Integer isEmailNotice;

    @Schema(name = "isReward", title = "是否打赏", required = true, type = "Integer")
    private Integer isReward;

    @Schema(name = "weiXinQRCode", title = "微信二维码", required = true, type = "String")
    private String weiXinQRCode;

    @Schema(name = "alipayQRCode", title = "支付宝二维码", required = true, type = "String")
    private String alipayQRCode;

    @Schema(name = "favicon", title = "favicon", required = true, type = "String")
    private String favicon;

    @Schema(name = "websiteTitle", title = "网页标题", required = true, type = "String")
    private String websiteTitle;

    @Schema(name = "gonganBeianNumber", title = "公安部备案编号", required = true, type = "String")
    private String gonganBeianNumber;

}
