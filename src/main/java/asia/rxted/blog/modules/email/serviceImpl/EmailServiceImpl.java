package asia.rxted.blog.modules.email.serviceImpl;

import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import asia.rxted.blog.common.ResultCode;
import asia.rxted.blog.common.ResultMessage;
import asia.rxted.blog.common.ResultUtil;
import asia.rxted.blog.modules.cache.CachePrefix;
import asia.rxted.blog.modules.cache.RedisCache;
import asia.rxted.blog.modules.email.config.EmailConfig;
import asia.rxted.blog.modules.email.service.EmailService;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailServiceImpl implements EmailService {
    private final EmailConfig emailConfig;
    private final JavaMailSender mailSender;

    @Autowired
    private RedisCache cache;

    public Long emailTimeTemp = 5 * 60 * 1000L; // 五分钟内有效
    public String emailFrom = "rx_ted@126.com"; // 发送者

    public EmailServiceImpl(EmailConfig emailConfig, JavaMailSender mailSender) {
        this.emailConfig = emailConfig;
        this.mailSender = mailSender;
    }

    @Override
    public void sendCode(String to, String subject, String text) {
        if (!emailConfig.checkEmailConnection(to)) {
            return;
        }
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message);

        try {
            helper.setFrom("rx_ted@126.com");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, true);
            mailSender.send(message);

        } catch (Exception e) {
            System.out.println("mail error: " + e);
        }
    }

    private String code = "123456";
    private String tipSubject = "验证码通知";
    private String text = "<p>您的验证码是：<strong>%s</strong></p>" +
            "<p>请注意，此验证码五分钟内有效，过期将自动失效。</p>" +
            "<p>请务必妥善保管，切勿将验证码泄露给他人。</p>";

    @Override
    public ResultMessage<Object> sendCode(String to) {
        if (!emailConfig.checkEmailConnection(to)) {
            return ResultUtil.success(ResultCode.EMAIL_ERROR);
        }

        Object result = cache.get(CachePrefix.EMAIL_VALIDATE.getPrefix() + to);
        if (result != null) {
            return ResultUtil.success(ResultCode.VERIFICATION_REPEAT_ERROR);
        }

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message);
        try {
            helper.setFrom(emailFrom);
            helper.setTo(to);
            helper.setSubject(tipSubject);
            helper.setText(String.format(text, code), true);
            mailSender.send(message);
            cache.put(CachePrefix.EMAIL_VALIDATE.getPrefix() + to, code, emailTimeTemp, TimeUnit.MILLISECONDS);
            return ResultUtil.success(ResultCode.VERIFICATION_EMAIL_SEND_SUCCESS);
        } catch (Exception e) {
            return ResultUtil.error(ResultCode.VERIFICATION_EMAIL_SEND_ERROR);
        }
    }

    @Override
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
