package asia.rxted.blog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
@EnableCaching
public class BlogApplication {

    public static String downloadAndValidateBaidu() {
        RestTemplate restTemplate = new RestTemplate();
        try {
            String content = restTemplate.getForObject(
                    "https://www.baidu.com",
                    String.class);

            // 验证内容是否包含百度首页特征
            if (content.contains("百度一下")) {
                return "✅ 下载成功！内容长度：" + content.length() + "\n✅ 内容验证通过";
            } else {
                return "❌ 内容验证失败（未找到特征字符串）";
            }

        } catch (Exception e) {
            return "❌ 下载失败: " + e.getMessage();
        }

    }

    public static void main(String[] args) {
        System.out.println(downloadAndValidateBaidu());
        SpringApplication.run(BlogApplication.class, args);
    }

}
