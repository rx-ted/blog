package asia.rxted.blog.modules.strategy.serviceImpl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.config.enums.ArticleStatusEnum;
import asia.rxted.blog.model.vo.ArticleVO;
import asia.rxted.blog.modules.article.service.ArticleService;
import asia.rxted.blog.modules.strategy.ArticleImportStrategy;
import cn.hutool.core.exceptions.ExceptionUtil;
import cn.hutool.core.util.StrUtil;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Objects;

@Slf4j
@Service("normalArticleImportStrategyImpl")
public class NormalArticleImportStrategyImpl implements ArticleImportStrategy {
    @Autowired
    private ArticleService articleService;

    @Override
    public void importArticles(MultipartFile file) {
        String articleTitle = Objects.requireNonNull(file.getOriginalFilename()).split("\\.")[0];
        StringBuilder articleContent = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            while (reader.ready()) {
                articleContent.append((char) reader.read());
            }
        } catch (IOException e) {
            log.error(StrUtil.format("导入文章失败, 堆栈:{}", ExceptionUtil.stacktraceToString(e)));
            ResultVO.fail(ResultCode.ARTICLE_IMPORT_FAILED_ERROR);
        }
        ArticleVO articleVO = ArticleVO.builder()
                .articleTitle(articleTitle)
                .articleContent(articleContent.toString())
                .status(ArticleStatusEnum.DRAFT.code())
                .build();
        articleService.saveOrUpdateArticle(articleVO);
    }
}
