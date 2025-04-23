package asia.rxted.blog.bean;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;

import asia.rxted.blog.constant.CommonConstant;
import asia.rxted.blog.constant.RabbitMQConstant;
import asia.rxted.blog.enums.EmailSendTypeEnum;
import asia.rxted.blog.model.dto.EmailMsgDTO;
import asia.rxted.blog.model.dto.MaxWellDataDTO;
import asia.rxted.blog.model.dto.SearchDTO;
import asia.rxted.blog.model.dto.SearchDTO.SearchDTOBuilder;
import asia.rxted.blog.model.entity.Article;
import asia.rxted.blog.model.entity.UserInfo;
import asia.rxted.blog.modules.article.service.ArticleService;
import asia.rxted.blog.modules.email.service.EmailService;
import asia.rxted.blog.modules.search.service.SearchService;
import asia.rxted.blog.modules.user.service.UserInfoService;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
@ConfigurationProperties(prefix = "website")
public class ConsumerConfig {
    @Value("${website.url}")
    private String websiteUrl;

    @Autowired
    private EmailService emailService;

    @Autowired
    private ArticleService articleService;

    @Autowired
    private UserInfoService userInfoService;

    @Autowired
    private SearchService searchService;

    @RabbitListener(queues = RabbitMQConstant.EMAIL_QUEUE)
    public void emailProcess(byte[] data) {
        try {
            EmailMsgDTO emailMsgDTO = JSON.parseObject(new String(data), EmailMsgDTO.class);
            if (emailMsgDTO.getEmail() == null || emailMsgDTO.getTemplate() == null) {
                return;
            }
            emailService.send(EmailSendTypeEnum.CODE, emailMsgDTO);
        } catch (Exception e) {
            log.error("Fail to send mail, msg: " + e);
        }

    }

    @RabbitListener(queues = RabbitMQConstant.SUBSCRIBE_QUEUE)
    public void subscribeProcess(byte[] data) {
        Integer articleId = JSON.parseObject(new String(data), Integer.class);
        Article article = articleService.getOne(new LambdaQueryWrapper<Article>().eq(Article::getId, articleId));
        List<UserInfo> users = userInfoService
                .list(new LambdaQueryWrapper<UserInfo>().eq(UserInfo::getIsSubscribe, CommonConstant.TRUE));
        List<String> emails = users.stream().map(UserInfo::getEmail).collect(Collectors.toList());
        log.info("subscriber name: " + emails.toString());
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
            emailService.send(EmailSendTypeEnum.SUBSCRIBE, emailDTO);
        }

    }

    @RabbitListener(queues = RabbitMQConstant.MAXWELL_QUEUE)
    public void maxWellProcess(byte[] data) {
        try {

            MaxWellDataDTO maxWellDataDTO = JSON.parseObject(new String(data), MaxWellDataDTO.class);
            Article article = JSON.parseObject(JSON.toJSONString(maxWellDataDTO.getData()), Article.class);
            switch (maxWellDataDTO.getType()) {
                case "insert":
                case "update":
                    // append or update
                    SearchDTOBuilder search = SearchDTO.builder()
                            .id(Integer.toString(article.getId()))
                            .content(article.getArticleContent())
                            .title(article.getArticleTitle())
                            .isDelete(article.getIsDelete())
                            .status(article.getStatus());
                    searchService.index(search.build());
                    break;
                case "delete":
                    searchService.delete(Integer.toString(article.getId()));
                    break;

                default:
                    break;
            }

        } catch (Exception e) {
            log.error("Fail to opearate maxwell, msg: " + e);
        }

    }

}
