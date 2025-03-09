package asia.rxted.blog.config.bean;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {
    // @Bean
    // public Docket docket() {
    // return new Docket(DocumentationType.OAS_30)
    // .apiInfo(apiInfo())
    // .enable(true)
    // // 通过.select()方法，去配置扫描接口
    // .select()
    // .apis(RequestHandlerSelectors.basePackage("asia.rxted.blog.controller"))
    // // 配置如何通过path过滤
    // .paths(PathSelectors.any())
    // .build();
    // }

    // Contact contact = new Contact("xx", "xxx", "xxxxxx");

    // // 配置Swagger 信息 = ApiInfo
    // private ApiInfo apiInfo() {
    // return new ApiInfo("Api文档",
    // "备注",
    // "1.0",
    // "123",
    // contact,
    // "Apache 2.0",
    // "http://www.apache.org/licenses/LICENSE-2.0",
    // new ArrayList<>());
    // }

    // @Override
    // public void configure(WebSecurity web) {
    // // 忽略swagger3所需要用到的静态资源，允许访问
    // String[] swaggerUrl = new String[] {
    // "/swagger-ui/**",
    // "/swagger-resources/**",
    // "/v2/api-docs",
    // "/v3/api-docs",
    // "/webjars/**",
    // };
    // web.ignoring().antMatchers(swaggerUrl);
    // }

    // @Bean
    // public OpenAPI customOpenAPI() {
    // return new OpenAPI()
    // .info(new Info()
    // .title("测试API")
    // .version("1.0")
    // .description("项目学习")
    // .termsOfService("https://test.com")
    // // .contact(contact)
    // );
    // }

}
