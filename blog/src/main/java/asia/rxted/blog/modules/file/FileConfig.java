package asia.rxted.blog.modules.file;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import lombok.Data;

@Component
@Data
public class FileConfig {
    /**
     * 默认大小
     */
    @Value("${file.max-size}")
    private long fileMaxSize; // 1MB

    /**
     * 默认的文件名最大长度
     */
    @Value("${file.max-len}")
    private int fileMaxLen;

    @Value("${file.mode}")
    private String mode;
    /**
     * 默认上传的地址
     */
    @Value("${file.default-upload-path}")
    private String fileDefaultUploadPath;

}
