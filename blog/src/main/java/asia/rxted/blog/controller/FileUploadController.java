package asia.rxted.blog.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.modules.file.FileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "文件上传模块")
@RestController
@RequestMapping("file")
public class FileUploadController {

    @Autowired
    private FileService fileService;

    // 使用默认路径
    @Operation(summary = "文件上传")
    @RequestMapping("upload")
    public ResultMessage<?> upload(MultipartFile file) throws Exception {
        fileService.write(file);
        return ResultVO.success();
    }

}
