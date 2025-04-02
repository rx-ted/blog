package asia.rxted.blog.config.bean;

import org.springframework.context.annotation.Configuration;

import asia.rxted.blog.config.enums.ZoneEnum;
import jakarta.annotation.PostConstruct;

import java.util.TimeZone;

@Configuration
public class GlobalZoneConfig {

    @PostConstruct
    public void setGlobalZone() {
        TimeZone.setDefault(TimeZone.getTimeZone(ZoneEnum.SHANGHAI.getZone()));
    }

}
