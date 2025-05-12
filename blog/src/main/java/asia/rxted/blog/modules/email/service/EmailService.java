package asia.rxted.blog.modules.email.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.enums.EmailSendTypeEnum;
import asia.rxted.blog.model.dto.EmailMsgDTO;
import asia.rxted.blog.modules.email.config.EmailConfig;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    @Autowired
    private EmailConfig emailConfig;

    @Autowired
    private JavaMailSender javaMailSender;

    @Autowired
    TemplateEngine templateEngine;

    public ResultCode send(EmailSendTypeEnum type, EmailMsgDTO msg) {
        if (type.equals(EmailSendTypeEnum.CODE)) {
            return sendCode(msg);
        } else if (type.equals(EmailSendTypeEnum.TEXT)) {
            return sendText(msg);
        } else if (type.equals(EmailSendTypeEnum.HTML)) {
            return sendHtml(msg);
        } else if (type.equals(EmailSendTypeEnum.SUBSCRIBE)) {
            return sendSubscribe(msg);
        } else {
            return ResultCode.UNKNOWN;
        }
    }

    private ResultCode sendCode(EmailMsgDTO msg) {
        return sendHtml(msg);
    }

    private ResultCode sendSubscribe(EmailMsgDTO msg) {
        return sendHtml(msg);

    }

    private ResultCode sendText(EmailMsgDTO msg) {
        try {
            // 添加邮件发送逻辑
            MimeMessage mimeMessage = new MimeMessage(emailConfig.mailSession());
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");
            helper.setFrom(emailConfig.getUsername());
            helper.setTo(msg.getEmail());
            helper.setSubject(msg.getSubject());
            helper.setText(msg.getContent());
            javaMailSender.send(mimeMessage);
            return ResultCode.SUCCESS;
        } catch (MessagingException e) {
            return ResultCode.EMAIL_ERROR;
        }
    }

    private ResultCode sendHtml(EmailMsgDTO emailMsgDTO) {
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
            return ResultCode.EMAIL_ERROR;
        }
    }

}
