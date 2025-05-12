package asia.rxted.blog.modules.website;

import asia.rxted.blog.model.dto.WebsiteAboutDTO;
import asia.rxted.blog.model.dto.WebsiteAdminInfoDTO;
import asia.rxted.blog.model.dto.WebsiteConfigDTO;
import asia.rxted.blog.model.dto.WebsiteHomeInfoDTO;
import asia.rxted.blog.model.vo.AboutVO;
import asia.rxted.blog.model.vo.WebsiteConfigVO;

public interface WebsiteInfoService {

    void report();

    WebsiteHomeInfoDTO getAuroraHomeInfo();

    WebsiteAdminInfoDTO getAuroraAdminInfo();

    void updateWebsiteConfig(WebsiteConfigVO websiteConfigVO);

    WebsiteConfigDTO getWebsiteConfig();

    void updateAbout(AboutVO aboutVO);

    WebsiteAboutDTO getAbout();

}
