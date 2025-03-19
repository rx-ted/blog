package asia.rxted.blog.config.bean;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;

@ConfigurationProperties(prefix = "swagger")
@Configuration
public class SwaggerConfig {

    @Autowired
    private Environment environment;

    @Value("${swagger.title}")
    private String title;
    @Value("${swagger.version}")
    private String version;
    @Value("${swagger.description}")
    private String description;
    @Value("${swagger.termsOfServiceUrl}")
    private String termsOfServiceUrl;
    @Value("${swagger.contact.name}")
    private String name;
    @Value("${swagger.contact.url}")
    private String url;
    @Value("${swagger.contact.email}")
    private String email;

    private boolean checkDevOrTest() {
        Profiles profiles = Profiles.of("dev", "test");
        boolean flag = environment.acceptsProfiles(profiles);
        System.out.println("Environment: " + profiles);
        System.out.println("Enable Swagger: " + flag);
        return flag;

    }

    private License license() {
        return new License()
                .name("MIT")
                .url("https://opensource.org/licenses/MIT");
    }

    private Contact contact() {
        Contact contact = new Contact();
        contact.setName(name);
        contact.setUrl(url);
        contact.setEmail(email);
        return contact;
    }

    private Info info() {
        return new Info()
                .contact(contact())
                .title(title)
                .description(description)
                .version(version)
                .license(license());
    }

    private ExternalDocumentation externalDocumentation() {
        return new ExternalDocumentation()
                .description(description)
                .url(termsOfServiceUrl);
    }

    @Bean
    public OpenAPI springShopOpenAPI() {
        return new OpenAPI()
                .info(info())
                .externalDocs(externalDocumentation());
    }
}
