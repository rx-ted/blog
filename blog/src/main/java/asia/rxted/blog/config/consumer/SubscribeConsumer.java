package asia.rxted.blog.config.consumer;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.amqp.rabbit.annotation.RabbitHandler;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;

import asia.rxted.blog.config.constant.CommonConstant;
import asia.rxted.blog.config.constant.RabbitMQConstant;
import asia.rxted.blog.model.dto.EmailMsgDTO;
import asia.rxted.blog.model.entity.Article;
import asia.rxted.blog.model.entity.UserInfo;
import asia.rxted.blog.modules.article.service.ArticleService;
import asia.rxted.blog.modules.email.service.EmailService;
import asia.rxted.blog.modules.user.service.SiteUserInfoService;

@Component
@ConfigurationProperties(prefix = "website")
@RabbitListener(queues = RabbitMQConstant.SUBSCRIBE_QUEUE)
public class SubscribeConsumer {

    @Value("${website.url}")
    private String websiteUrl;

    @Autowired
    private ArticleService articleService;

    @Autowired
    private SiteUserInfoService userInfoService;

    @Autowired
    private EmailService emailService;

    @RabbitHandler
    public void process(byte[] data) {
        Integer articleId = JSON.parseObject(new String(data), Integer.class);
        Article article = articleService.getOne(new LambdaQueryWrapper<Article>().eq(Article::getId, articleId));
        List<UserInfo> users = userInfoService
                .list(new LambdaQueryWrapper<UserInfo>().eq(UserInfo::getIsSubscribe, CommonConstant.TRUE));
        List<String> emails = users.stream().map(UserInfo::getEmail).collect(Collectors.toList());
        for (String email : emails) {
            EmailMsgDTO emailDTO = new EmailMsgDTO();
            Map<String, Object> map = new HashMap<>();
            emailDTO.setEmail(email);
            emailDTO.setSubject("文章订阅");
            emailDTO.setTemplate("common.html");
            String url = websiteUrl + "/articles/" + articleId;
            if (article.getUpdateTime() == null) {
                map.put("content", "rx-ted的个人博客发布了新的文章，"
                        + "<a style=\"text-decoration:none;color:#12addb\" href=\"" + url + "\">点击查看</a>");
            } else {
                map.put("content", "rx-ted的个人博客对《" + article.getArticleTitle() + "》进行了更新，"
                        + "<a style=\"text-decoration:none;color:#12addb\" href=\"" + url + "\">点击查看</a>");
            }
            emailDTO.setCommentMap(map);
            emailService.sendHtmlMail(emailDTO);
        }
    }
}
