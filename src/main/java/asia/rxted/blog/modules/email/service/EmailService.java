package asia.rxted.blog.modules.email.service;

import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import asia.rxted.blog.common.ResultCode;
import asia.rxted.blog.common.ResultMessage;
import asia.rxted.blog.common.ResultUtil;
import asia.rxted.blog.modules.cache.CachePrefix;
import asia.rxted.blog.modules.cache.RedisCache;
import asia.rxted.blog.modules.email.config.EmailConfig;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    @Autowired
    private EmailConfig emailConfig;

    @Autowired
    private JavaMailSender javaMailSender;

    @Autowired
    private RedisCache cache;

    public Long emailTimeTemp = 5 * 60 * 1000L; // 五分钟内有效
    public String emailFrom = "rx_ted@126.com"; // 发送者
    private String code = "123456";
    private String tipSubject = "验证码通知";
    private String text = "<p>您的验证码是：<strong>%s</strong></p>" +
            "<p>请注意，此验证码五分钟内有效，过期将自动失效。</p>" +
            "<p>请务必妥善保管，切勿将验证码泄露给他人。</p>";

    public ResultMessage<Object> sendEmail(String to) {
        Object result = cache.get(CachePrefix.EMAIL_VALIDATE.getPrefix() + to);
        if (result != null) {
            return ResultUtil.success(ResultCode.VERIFICATION_REPEAT_ERROR);
        }

        try {
            // 添加邮件发送逻辑
            MimeMessage message = new MimeMessage(emailConfig.mailSession());
            message.setFrom(emailFrom);
            message.addRecipient(Message.RecipientType.TO, new InternetAddress(to));
            message.setSubject(tipSubject);
            message.setText(text, "UTF-8", "html");
            javaMailSender.send(message);
            cache.put(CachePrefix.EMAIL_VALIDATE.getPrefix() + to, code, emailTimeTemp, TimeUnit.MILLISECONDS);
            return ResultUtil.success(ResultCode.VERIFICATION_EMAIL_SEND_SUCCESS);

        } catch (MessagingException e) {
            // e.printStackTrace();
            return ResultUtil.error(ResultCode.VERIFICATION_EMAIL_SEND_ERROR);
        }
    }

    public ResultMessage<Object> verifyCode(String to, String code) {

        Object result = cache.get(CachePrefix.EMAIL_VALIDATE.getPrefix() + to);
        if (result == null) {
            return ResultUtil.error(ResultCode.VERIFICATION_CODE_INVALID);
        }
        if (!result.toString().equals(code)) {
            return ResultUtil.error(ResultCode.VERIFICATION_ERROR);
        }
        cache.remove(CachePrefix.EMAIL_VALIDATE.getPrefix() + to);
        return ResultUtil.success(ResultCode.VERIFICATION_SUCCESS);

    }
}
