package asia.rxted.blog.config.bean;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import asia.rxted.blog.config.constant.RabbitMQConstant;

@Configuration
public class RabbitMQConfig {
    /**
     * MAXWELL config
     */
    @Bean
    public Queue articleQueue() {
        return new Queue(RabbitMQConstant.MAXWELL_QUEUE, true);
    }

    @Bean
    public FanoutExchange maxWellExchange() {
        return new FanoutExchange(RabbitMQConstant.MAXWELL_EXCHANGE, true, false);
    }

    @Bean
    public Binding bindingArticleDirect() {
        return BindingBuilder.bind(articleQueue()).to(maxWellExchange());
    }

    /*
     * Email config
     */
    @Bean
    public Queue emailQueue() {
        return new Queue(RabbitMQConstant.EMAIL_QUEUE, true);
    }

    @Bean
    public FanoutExchange emaillExchange() {
        return new FanoutExchange(RabbitMQConstant.EMAIL_EXCHANGE, true, false);
    }

    @Bean
    public Binding bindingEmailDirect() {
        return BindingBuilder.bind(emailQueue()).to(emaillExchange());
    }

}
