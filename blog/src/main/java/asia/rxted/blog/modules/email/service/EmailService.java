package asia.rxted.blog.modules.email.service;

import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.model.dto.EmailMsgDTO;
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

    @Autowired
    TemplateEngine templateEngine;

    public Long emailTimeTemp = 5 * 60 * 1000L; // 五分钟内有效
    private String code = "123456";
    private String tipSubject = "验证码通知";
    private String text = "<p>您的验证码是：<strong>%s</strong></p>" +
            "<p>请注意，此验证码五分钟内有效，过期将自动失效。</p>" +
            "<p>请务必妥善保管，切勿将验证码泄露给他人。</p>";

    public ResultCode sendTextMail(String to) {
        Object result = cache.get(CachePrefix.EMAIL_VALIDATE.getPrefix() + to);
        if (result != null) {
            return ResultCode.VERIFICATION_REPEAT_ERROR;
        }
        try {
            // 添加邮件发送逻辑
            MimeMessage message = new MimeMessage(emailConfig.mailSession());
            message.setFrom(emailConfig.getUsername());
            message.addRecipient(Message.RecipientType.TO, new InternetAddress(to));
            message.setSubject(tipSubject);
            message.setText(text, "UTF-8", "html");
            javaMailSender.send(message);
            cache.put(CachePrefix.EMAIL_VALIDATE.getPrefix() + to, code, emailTimeTemp, TimeUnit.MILLISECONDS);
            return ResultCode.VERIFICATION_EMAIL_SEND_SUCCESS;

        } catch (MessagingException e) {
            // e.printStackTrace();
            return ResultCode.VERIFICATION_EMAIL_SEND_ERROR;
        }
    }

    public ResultCode sendHtmlMail(EmailMsgDTO emailMsgDTO) {
        Object result = cache.get(CachePrefix.EMAIL_VALIDATE.join(emailMsgDTO.getEmail()));
        if (result != null) {
            return ResultCode.VERIFICATION_REPEAT_ERROR;
        }
        try {
            // 添加邮件发送逻辑
            MimeMessage mimeMessage = new MimeMessage(emailConfig.mailSession());
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");
            Context context = new Context();
            context.setVariables(emailMsgDTO.getCommentMap());
            String process = templateEngine.process(emailMsgDTO.getTemplate(), context);
            helper.setFrom(emailConfig.getUsername());
            helper.setTo(emailMsgDTO.getEmail());
            helper.setSubject(emailMsgDTO.getSubject());
            helper.setText(process, true);
            javaMailSender.send(mimeMessage);
            return ResultCode.SUCCESS;
        } catch (MessagingException e) {
            // e.printStackTrace();
            return ResultCode.VERIFICATION_EMAIL_SEND_ERROR;
        }
    }

    public ResultMessage<Object> verifyCode(String to, String code) {

        Object result = cache.get(CachePrefix.EMAIL_VALIDATE.getPrefix() + to);
        if (result == null) {
            return ResultVO.error(ResultCode.VERIFICATION_CODE_INVALID);
        }
        if (!result.toString().equals(code)) {
            return ResultVO.error(ResultCode.VERIFICATION_ERROR);
        }
        cache.remove(CachePrefix.EMAIL_VALIDATE.getPrefix() + to);
        return ResultVO.success(ResultCode.VERIFICATION_SUCCESS);

    }
}
