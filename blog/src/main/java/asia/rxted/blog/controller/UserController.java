package asia.rxted.blog.controller;

import static asia.rxted.blog.config.constant.OptTypeConstant.UPDATE;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.config.annotation.AccessLimit;
import asia.rxted.blog.config.annotation.OptLog;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.UserAdminDTO;
import asia.rxted.blog.model.dto.UserAreaDTO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.PasswordVO;
import asia.rxted.blog.model.vo.UserVO;
import asia.rxted.blog.modules.user.service.UserAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "用户管理", description = "用户管理相关API")
@RestController()
@RequestMapping("users")
public class UserController {

    @Autowired
    private UserAuthService userAuthService;

    @AccessLimit(seconds = 60, maxCount = 1)
    @Operation(summary = "发送邮箱验证码")
    @Parameter(name = "username", description = "用户名", required = true)
    @GetMapping("code")
    public ResultMessage<?> sendCode(String username) {
        return ResultVO.success(userAuthService.sendCode(username));
    }

    @Operation(summary = "获取用户区域分布")
    @GetMapping("/admin/area")
    public ResultMessage<List<UserAreaDTO>> listUserAreas(ConditionVO conditionVO) {
        return ResultVO.data(userAuthService.listUserAreas(conditionVO));
    }

    @Operation(summary = "查询后台用户列表")
    @GetMapping("/admin")
    public ResultMessage<PageResultDTO<UserAdminDTO>> listUsers(ConditionVO conditionVO) {
        return ResultVO.data(userAuthService.listUsers(conditionVO));
    }

    @Operation(summary = "用户注册")
    @PostMapping("/register")
    public ResultMessage<Object> registerUser(@RequestBody UserVO userVO) {
        return ResultVO.success(userAuthService.register(userVO));
    }

    @Operation(summary = "修改密码")
    @PostMapping("/password")
    public ResultMessage<Object> ForgetPassword(@Valid @RequestBody UserVO userVO) {
        return ResultVO.data(userAuthService.updatePassword(userVO));
    }

    @OptLog(optType = UPDATE)
    @Operation(summary = "修改管理员密码")
    @PutMapping("admin/password")
    public ResultMessage<?> updateAdminPassword(@Valid @RequestBody PasswordVO passwordVO) {
        return ResultVO.success(userAuthService.updateAdminPassword(passwordVO));

    }

    @Operation(summary = "用户登出")
    @GetMapping("/logout")
    public ResultMessage<Object> logout() {
        return ResultVO.data(userAuthService.logout());
    }

}
