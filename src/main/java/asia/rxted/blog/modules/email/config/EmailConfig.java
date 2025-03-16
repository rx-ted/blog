package asia.rxted.blog.modules.email.config;

import java.util.Properties;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.mail.AuthenticationFailedException;
import jakarta.mail.Authenticator;
import jakarta.mail.MessagingException;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;

@Service
public class EmailConfig {
    private final Set<String> unavailableEmails = ConcurrentHashMap.newKeySet();
    // 邮箱配置（从配置文件读取）
    @Value("${spring.mail.host}")
    private String smtpHost;

    @Value("${spring.mail.port}")
    private int smtpPort;

    @Value("${spring.mail.username}")
    private String smtpUsername;

    @Value("${spring.mail.password}")
    private String smtpPassword;

    // 检测邮箱连接
    public boolean checkEmailConnection(String email) {
        if (unavailableEmails.contains(email)) {
            return false; // 直接返回不可用
        }

        try {
            Properties props = new Properties();
            props.put("spring.mail.smtp.auth", "true");
            props.put("spring.mail.smtp.starttls.enable", "true");
            props.put("spring.mail.smtp.host", smtpHost);
            props.put("spring.mail.smtp.port", smtpPort);

            Session session = Session.getInstance(props, new Authenticator() {
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(smtpUsername, smtpPassword);
                }
            });

            // 尝试连接（不发送邮件，仅验证）
            Transport transport = session.getTransport("smtp");
            transport.connect(smtpHost, smtpPort, smtpUsername, smtpPassword);
            transport.close();
            return true;
        } catch (AuthenticationFailedException e) {
            // log.error("邮箱认证失败: {}", email, e);
            System.out.println("邮箱认证失败:" + email + "\n" + "error: " + e);
            unavailableEmails.add(email); // 记录为不可用
            return false;
        } catch (MessagingException e) {
            // log.error("邮箱连接失败: {}", email, e);
            System.out.println("邮箱连接失败:" + email + "\n" + "error: " + e);
            unavailableEmails.add(email); // 记录为不可用
            return false;
        }
    }

    // 定时任务：重新检查不可用邮箱
    @Scheduled(fixedRate = 3600000) // 每小时检查一次
    public void recheckUnavailableEmails() {
        unavailableEmails.removeIf(email -> checkEmailConnection(email));
    }

}
