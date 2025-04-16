package asia.rxted.blog.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "admin管理", description = "admin管理相关API")
@RestController()
@RequestMapping("admin")
public class AdminController {

    @Operation(summary = "关于")
    @GetMapping()
    public ResultMessage<?> about() {
        return ResultVO.data("Hello this is admin page.");
    }
}
