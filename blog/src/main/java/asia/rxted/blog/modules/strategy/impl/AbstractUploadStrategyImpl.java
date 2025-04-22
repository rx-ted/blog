package asia.rxted.blog.modules.strategy.impl;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import asia.rxted.blog.config.BizException;
import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.modules.strategy.UploadStrategy;
import asia.rxted.blog.utils.FileUtils;

import java.io.*;

@Service
public abstract class AbstractUploadStrategyImpl implements UploadStrategy {

    @Override
    public String uploadFile(MultipartFile file, String path) {
        try {
            String md5 = FileUtils.getMd5(file.getInputStream());
            String extName = FileUtils.getExtName(file.getOriginalFilename());
            String fileName = md5 + extName;
            if (!exists(path + fileName)) {
                upload(path, fileName, file.getInputStream());
            }
            return getFileAccessUrl(path + fileName);
        } catch (Exception e) {
            e.printStackTrace();
            throw new BizException(ResultCode.FILE_UPLOAD_ERROR);
        }
    }

    @Override
    public String uploadFile(String fileName, InputStream inputStream, String path) {
        try {
            upload(path, fileName, inputStream);
            return getFileAccessUrl(path + fileName);
        } catch (Exception e) {
            e.printStackTrace();
            throw new BizException(ResultCode.FILE_UPLOAD_ERROR);
        }
    }

    public abstract Boolean exists(String filePath);

    public abstract void upload(String path, String fileName, InputStream inputStream) throws IOException;

    public abstract String getFileAccessUrl(String filePath);

}
