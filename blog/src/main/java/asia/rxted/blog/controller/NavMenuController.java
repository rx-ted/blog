package asia.rxted.blog.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.modules.navMenu.service.NavMenuServer;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;

@Tag(name = "菜单管理", description = "菜单管理API")
@RestController
@RequestMapping("/nav")
public class NavMenuController {
    @Autowired
    private NavMenuServer navMenuServer;

    @Operation(summary = "获取所有菜单")
    @GetMapping("/menu")
    public ResultMessage<Object> getNavMenu() {
        try {
            return ResultVO.data(navMenuServer.list());

        } catch (Exception e) {
            e.printStackTrace();
            return ResultVO.error(ResultCode.ERROR);
        }
    }

}
