package asia.rxted.blog.common;

public enum ResultCode {

    // 成功状态码
    SUCCESS(200, "成功"),

    // 失败返回码
    ERROR(400, "服务器繁忙，请稍后重试"),

    // 失败返回码
    DEMO_SITE_EXCEPTION(4001, "演示站点禁止使用"),
    // 参数异常
    PARAMS_ERROR(4002, "参数异常"),

    /**
     * 验证码
     */
    VERIFICATION_SEND_SUCCESS(80201, "短信验证码,发送成功"),
    VERIFICATION_ERROR(80202, "验证失败"),
    VERIFICATION_CODE_INVALID(80204, "验证码已失效，请重新校验"),
    VERIFICATION_SMS_CHECKED_ERROR(80210, "短信验证码错误，请重新校验"),

    /**
     * 用户
     */
    USER_EDIT_SUCCESS(20001, "用户修改成功"),
    USER_NOT_EXIST(20002, "用户不存在"),
    USER_NOT_LOGIN(20003, "用户未登录"),
    USER_AUTH_EXPIRED(20004, "用户已退出，请重新登录"),
    USER_AUTHORITY_ERROR(20005, "权限不足"),
    USER_CONNECT_LOGIN_ERROR(20006, "未找到登录信息"),
    USER_EXIST(20008, "该用户名或手机号已被注册"),
    USER_PHONE_NOT_EXIST(20009, "手机号不存在"),
    USER_PASSWORD_ERROR(20010, "密码不正确"),
    USER_NOT_PHONE(20011, "非当前用户的手机号"),
    USER_CONNECT_ERROR(20012, "联合第三方登录，授权信息错误"),
    USER_RECEIPT_REPEAT_ERROR(20013, "会员发票信息重复"),
    USER_RECEIPT_NOT_EXIST(20014, "会员发票信息不存在"),
    USER_EDIT_ERROR(20015, "用户修改失败"),
    USER_OLD_PASSWORD_ERROR(20016, "旧密码不正确"),
    USER_COLLECTION_EXIST(20017, "无法重复收藏"),
    USER_GRADE_IS_DEFAULT(20018, "会员等级为默认会员等级"),
    USER_NOT_BINDING(20020, "未绑定用户"),
    USER_AUTO_REGISTER_ERROR(20021, "自动注册失败,请稍后重试"),
    USER_OVERDUE_CONNECT_ERROR(20022, "授权信息已过期，请重新授权/登录"),
    USER_CONNECT_BANDING_ERROR(20023, "当前联合登陆方式，已绑定其他账号，需进行解绑操作"),
    USER_CONNECT_NOT_EXIST_ERROR(20024, "暂无联合登陆信息，无法实现一键注册功能，请点击第三方登录进行授权"),
    USER_POINTS_ERROR(20024, "用户积分不足"),
    CLERK_SUPPER(20025, "店主无法操作"),
    CLERK_SAVE_ERROR(20026, "店员保存失败"),
    CLERK_NOT_FOUND_ERROR(20027, "店员不存在"),
    USER_STATUS_ERROR(20028, "用户已禁用"),
    CLERK_USER_ERROR(20029, "此账户已经绑定其他店铺"),
    CLERK_ALREADY_EXIT_ERROR(20030, "店员已经存在"),
    CLERK_DISABLED_ERROR(20031, "店员已禁用"),
    CLERK_CURRENT_SUPPER(20032, "无法删除当前登录店员"),
    CANT_EDIT_CLERK_SHOPKEEPER(20033, "无法在店员管理编辑店员信息"),
    USER_MOBILE_REPEATABLE_ERROR(20034, "该手机号已存在"),
    USER_LOGIN_SUCCESS(20001, "用户登录成功"),
    USER_LOGOUT_SUCCESS(20002, "用户登出成功");

    private final Integer code;
    private final String message;

    ResultCode(Integer code, String message) {
        this.code = code;
        this.message = message;
    }

    public Integer code() {
        return this.code;
    }

    public String message() {
        return this.message;
    }

}
