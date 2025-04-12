package asia.rxted.blog.modules.email.config;

import java.util.Properties;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import jakarta.mail.Session;
import lombok.Data;

@Configuration
@Data
public class EmailConfig {

    // 邮箱配置（从配置文件读取）
    @Value("${spring.mail.host}")
    private String host;

    @Value("${spring.mail.port}")
    private int port;

    @Value("${spring.mail.username}")
    private String username;

    @Value("${spring.mail.password}")
    private String password;

    @Value("${spring.mail.protocol}")
    private String protocol;

    @Bean
    @Primary
    public Session mailSession() {
        Properties props = new Properties();

        props.put("spring.mail.smtp.auth", "true");
        props.put("spring.mail.smtp.host", host);
        props.put("spring.mail.smtp.port", port);
        // 安全配置
        switch (port) {
            case 465 -> props.put("mail.smtp.ssl.enable", "true");
            case 587 -> props.put("mail.smtp.starttls.enable", "true");
            case 25 -> {
            } // 无需额外配置
            default -> System.out.println("Warning: Unsupported mail port " + port);
        }
        return Session.getInstance(props);
    }

}
