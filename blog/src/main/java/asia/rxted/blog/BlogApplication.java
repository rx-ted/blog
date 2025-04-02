package asia.rxted.blog;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.web.client.RestTemplate;

import lombok.extern.slf4j.Slf4j;

@SpringBootApplication
@EnableCaching
@MapperScan("asia.rxted.blog.mapper")
@Slf4j
public class BlogApplication {

    public static void main(String[] args) {
        ConfigurableEnvironment env = SpringApplication.run(BlogApplication.class, args).getEnvironment();

        log.info("\n----------------------------------------------------------\n\t" +
                "Application: '{}' is running Success! \n\t" +
                "Local URL: \thttp://localhost:{}\n\t" +
                "Document:\thttp://localhost:{}/doc.html\n" +
                "----------------------------------------------------------",
                env.getProperty("spring.application.name"),
                env.getProperty("server.port"),
                env.getProperty("server.port"));
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

}
