package asia.rxted.blog.modules.user.service;

import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.model.dto.SiteAboutDTO;
import asia.rxted.blog.model.dto.SiteAdminInfoDTO;
import asia.rxted.blog.model.dto.SiteHomeInfoDTO;
import asia.rxted.blog.model.dto.WebsiteConfigDTO;
import asia.rxted.blog.model.entity.UserInfo;
import asia.rxted.blog.model.vo.AboutVO;
import asia.rxted.blog.model.vo.WebsiteConfigVO;

public interface SiteUserInfoService extends IService<UserInfo> {

    void report();

    SiteHomeInfoDTO getAuroraHomeInfo();

    SiteAdminInfoDTO getAuroraAdminInfo();

    void updateWebsiteConfig(WebsiteConfigVO websiteConfigVO);

    WebsiteConfigDTO getWebsiteConfig();

    void updateAbout(AboutVO aboutVO);

    SiteAboutDTO getAbout();

}
