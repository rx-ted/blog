package asia.rxted.blog.controller;

import static asia.rxted.blog.constant.OptTypeConstant.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import asia.rxted.blog.annotation.AccessLimit;
import asia.rxted.blog.annotation.OptLog;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.model.vo.UserLoginVO;
import asia.rxted.blog.model.vo.EmailVO;
import asia.rxted.blog.modules.user.service.UserAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@Tag(name = "用户管理", description = "用户管理相关API")
@RestController()
@RequestMapping("user")
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

    @OptLog(optType = SAVE)
    @Operation(summary = "用户注册")
    @PostMapping("/register")
    public ResultMessage<Object> registerUser(@RequestBody EmailVO userVO) {
        return ResultVO.success(userAuthService.register(userVO));
    }

    @OptLog(optType = UPDATE)
    @Operation(summary = "修改密码")
    @PostMapping("/password")
    public ResultMessage<Object> ForgetPassword(@Valid @RequestBody EmailVO userVO) {
        return ResultVO.data(userAuthService.updatePassword(userVO));
    }

    @OptLog(optType = DELETE)
    @Operation(summary = "用户登出")
    @GetMapping("/logout")
    public ResultMessage<Object> logout() {
        return ResultVO.data(userAuthService.logout());
    }

    @OptLog(optType = SAVE)
    @Operation(summary = "用户登录")
    @PostMapping("/login")
    public ResultMessage<?> login(@RequestBody UserLoginVO dto) {
        return userAuthService.login(dto);
    }

}
