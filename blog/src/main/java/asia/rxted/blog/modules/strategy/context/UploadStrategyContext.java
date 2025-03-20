package asia.rxted.blog.modules.strategy.context;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import asia.rxted.blog.modules.strategy.UploadStrategy;
import asia.rxted.blog.modules.strategy.config.UploadModeEnum;

import java.io.InputStream;
import java.util.Map;


@Service
public class UploadStrategyContext {

    @Value("${upload.mode}")
    private String uploadMode;

    @Autowired
    private Map<String, UploadStrategy> uploadStrategyMap;

    public String executeUploadStrategy(MultipartFile file, String path) {
        return uploadStrategyMap.get(UploadModeEnum.getStrategy(uploadMode)).uploadFile(file, path);
    }

    public String executeUploadStrategy(String fileName, InputStream inputStream, String path) {
        return uploadStrategyMap.get(UploadModeEnum.getStrategy(uploadMode)).uploadFile(fileName, inputStream, path);
    }

}
