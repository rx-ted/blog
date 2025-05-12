package asia.rxted.blog.controller;

import javax.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import asia.rxted.blog.annotation.OptLog;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.constant.OptTypeConstant;
import asia.rxted.blog.model.dto.WebsiteAboutDTO;
import asia.rxted.blog.model.dto.WebsiteAdminInfoDTO;
import asia.rxted.blog.model.dto.WebsiteConfigDTO;
import asia.rxted.blog.model.dto.WebsiteHomeInfoDTO;
import asia.rxted.blog.model.vo.AboutVO;
import asia.rxted.blog.model.vo.WebsiteConfigVO;
import asia.rxted.blog.modules.website.WebsiteInfoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "网站信息")
@RestController
public class WebsiteInfoController {

    @Autowired
    private WebsiteInfoService websiteInfoService;

    // @Autowired
    // private UploadStrategyContext uploadStrategyContext;

    @Operation(summary = "上报访客信息")
    @PostMapping("/report")
    public ResultMessage<?> report() {
        websiteInfoService.report();
        return ResultVO.success();
    }

    @Operation(summary = "获取系统信息")
    @GetMapping("/")
    public ResultMessage<WebsiteHomeInfoDTO> getBlogHomeInfo() {
        return ResultVO.data(websiteInfoService.getAuroraHomeInfo());
    }

    @Operation(summary = "获取系统后台信息")
    @GetMapping("/admin")
    public ResultMessage<WebsiteAdminInfoDTO> getBlogBackInfo() {
        return ResultVO.data(websiteInfoService.getAuroraAdminInfo());
    }

    @OptLog(optType = OptTypeConstant.UPDATE)
    @Operation(summary = "更新网站配置")
    @PutMapping("/admin/website/config")
    public ResultMessage<?> updateWebsiteConfig(@Valid @RequestBody WebsiteConfigVO websiteConfigVO) {
        websiteInfoService.updateWebsiteConfig(websiteConfigVO);
        return ResultVO.success();
    }

    @Operation(summary = "获取网站配置")
    @GetMapping("/admin/website/config")
    public ResultMessage<WebsiteConfigDTO> getWebsiteConfig() {
        return ResultVO.data(websiteInfoService.getWebsiteConfig());
    }

    @Operation(summary = "查看关于我信息")
    @GetMapping("/about")
    public ResultMessage<WebsiteAboutDTO> getAbout() {
        return ResultVO.data(websiteInfoService.getAbout());
    }

    @OptLog(optType = OptTypeConstant.UPDATE)
    @Operation(summary = "修改关于我信息")
    @PutMapping("/admin/about")
    public ResultMessage<?> updateAbout(@Valid @RequestBody AboutVO aboutVO) {
        websiteInfoService.updateAbout(aboutVO);
        return ResultVO.success();
    }

    @OptLog(optType = OptTypeConstant.UPLOAD)
    @Operation(summary = "上传博客配置图片")
    @Parameter(name = "file", description = "图片", required = true, schema = @Schema(type = "string", format = "binary"))
    @PostMapping("/admin/config/images")
    public ResultMessage<String> savePhotoAlbumCover(MultipartFile file) {
        // return ResultVO.data(uploadStrategyContext.executeUploadStrategy(file,
        // FilePathEnum.CONFIG.getPath()));
        return null;
    }

}
