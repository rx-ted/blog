package asia.rxted.blog.modules.file.impl;

import java.beans.Transient;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import asia.rxted.blog.config.BizException;
import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.enums.FileUploadEnum;
import asia.rxted.blog.mapper.FileMapper;
import asia.rxted.blog.mapper.FileResourceMapper;
import asia.rxted.blog.model.entity.File;
import asia.rxted.blog.model.entity.FileResource;
import asia.rxted.blog.modules.file.FileConfig;
import asia.rxted.blog.modules.file.FileService;
import asia.rxted.blog.utils.MimeTypeUtils;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class FileServiceImpl implements FileService {

    @Autowired
    private FileConfig fileConfig;

    @Autowired
    private FileMapper fileMapper;

    @Autowired
    private FileResourceMapper fileResourceMapper;

    private File assertAllowed(MultipartFile file, String[] allowedExtension) {

        File f = new File();
        // 就算什么也不传，controller层的file也不为空，但是originalFilename会为空（亲测）
        String originalFilename = file.getOriginalFilename();

        if (Objects.isNull(originalFilename) || "".equals(originalFilename)) {
            throw new BizException(ResultCode.FILE_NOT_EXIST_ERROR);
        }
        f.setName(originalFilename);

        if (Objects.nonNull(file.getOriginalFilename())) {
            int fileNamelength = file.getOriginalFilename().length();
            if (fileNamelength > fileConfig.getFileMaxLen()) {
                throw new BizException(ResultCode.FILE_NAME_LENGTH_ERROR);
            }
        }
        long size = file.getSize();
        if (size > fileConfig.getFileMaxSize() * 1024 * 1024) {
            throw new BizException(ResultCode.FILE_SIZE_ERROR);
        }
        f.setSize(size);
        String type = getExtension(file);
        if (Objects.nonNull(allowedExtension) && !isAllowedExtension(type, allowedExtension)) {
            throw new BizException(ResultCode.FILE_TYPE_NOT_SUPPORT);
        }
        f.setType(type);
        f.setMd5(getFileMd5(file));
        LocalDate currentDate = LocalDate.now();
        String datePath = currentDate.format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        Path path = Paths.get(fileConfig.getFileDefaultUploadPath(), datePath).resolve(originalFilename);
        f.setPath(path.toString());
        f.setCreateTime(LocalDateTime.now());
        f.setUpdateTime(LocalDateTime.now());
        return f;
    }

    /**
     * 判断MIME类型是否是允许的MIME类型
     *
     * @param extension
     * @param allowedExtension
     * @return
     */
    private static final boolean isAllowedExtension(String extension, String[] allowedExtension) {
        for (String str : allowedExtension) {
            if (str.equalsIgnoreCase(extension)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 获取文件名的后缀
     *
     * @param file 表单文件
     * @return 后缀名
     */
    private String getExtension(MultipartFile file) {
        String fileName = file.getOriginalFilename();
        String extension = null;
        if (fileName == null) {
            return null;
        } else {
            int index = indexOfExtension(fileName);
            extension = index == -1 ? "" : fileName.substring(index + 1);
        }

        if (StringUtils.isEmpty(extension)) {
            extension = MimeTypeUtils.getExtension(file.getContentType());
        }
        return extension;
    }

    private static int indexOfLastSeparator(String filename) {
        if (filename == null) {
            return -1;
        } else {
            int lastUnixPos = filename.lastIndexOf(47);
            int lastWindowsPos = filename.lastIndexOf(92);
            return Math.max(lastUnixPos, lastWindowsPos);
        }
    }

    private static int indexOfExtension(String filename) {
        if (filename == null) {
            return -1;
        } else {
            int extensionPos = filename.lastIndexOf(46);
            int lastSeparator = indexOfLastSeparator(filename);
            return lastSeparator > extensionPos ? -1 : extensionPos;
        }
    }

    @Override
    public void write(MultipartFile file) {
        var fileEntity = assertAllowed(file, MimeTypeUtils.DEFAULT_ALLOWED_EXTENSION);

        String mode = null;

        for (var tmp : FileUploadEnum.values()) {
            if (tmp.name().toLowerCase().equals(fileConfig.getMode().toLowerCase())) {
                mode = fileConfig.getMode().toLowerCase();
                break;
            }
        }
        if (Objects.isNull(mode)) {
            throw new BizException(ResultCode.FILE_UPLOAD_STRATEGY_ERROR);
        }
        save(mode, file, fileEntity);
    }

    @Transient
    private void save(String mode, MultipartFile file, File fileEntity) {

        fileMapper.insert(fileEntity);
        if (mode.equals("local")) {

            var path = Paths.get(fileEntity.getPath());
            try {
                if (!Files.exists(path.getParent())) {
                    Files.createDirectories(path.getParent());
                }
                file.transferTo(path.toFile());
                log.info("文件上传成功，保存路径: " + path.toString());
            } catch (IOException e) {
                throw new BizException(ResultCode.IO_OPEARTOR_ERROR);
            }
        } else if (mode.equals("mysql")) {
            try {
                FileResource fileResource = FileResource.builder()
                        .fileId(fileEntity.getId())
                        .data(file.getBytes()).build();
                fileResourceMapper.insert(fileResource);
            } catch (IOException e) {
                throw new BizException(ResultCode.IO_OPEARTOR_ERROR);
            }

        }

    }

    private String getFileMd5(MultipartFile file) {
        try {
            // 获取文件的输入流
            InputStream inputStream = file.getInputStream();

            // 创建 MessageDigest 实例，指定算法为 MD5
            MessageDigest digest = MessageDigest.getInstance("MD5");

            // 读取文件内容并更新到 MessageDigest
            byte[] buffer = new byte[1024];// 使用了1KB的缓冲区,可以根据需要调整缓冲区大小以提高性能。
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                digest.update(buffer, 0, bytesRead);
            }

            // 关闭输入流
            inputStream.close();

            // 计算 MD5 哈希值
            byte[] md5Bytes = digest.digest();

            // 将字节数组转换为十六进制字符串
            StringBuilder md5Hex = new StringBuilder();
            for (byte b : md5Bytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    md5Hex.append('0'); // 补零
                }
                md5Hex.append(hex);
            }
            // 返回 MD5 值
            return md5Hex.toString();
        } catch (Exception e) {
            throw new BizException("计算 MD5 失败: " + e.getMessage());
        }
    }

}
