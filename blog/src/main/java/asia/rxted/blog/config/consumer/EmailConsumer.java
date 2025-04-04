package asia.rxted.blog.config.consumer;

import org.springframework.amqp.rabbit.annotation.RabbitHandler;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.alibaba.fastjson.JSON;

import asia.rxted.blog.config.constant.RabbitMQConstant;
import asia.rxted.blog.model.dto.EmailMsgDTO;
import asia.rxted.blog.modules.email.service.EmailService;

@Component
@RabbitListener(queues = RabbitMQConstant.EMAIL_QUEUE)
public class EmailConsumer {

    @Autowired
    private EmailService emailService;

    @RabbitHandler
    public void process(byte[] data) {
        EmailMsgDTO emailMsgDTO = JSON.parseObject(new String(data), EmailMsgDTO.class);
        emailService.sendHtmlMail(emailMsgDTO);
    }
}
