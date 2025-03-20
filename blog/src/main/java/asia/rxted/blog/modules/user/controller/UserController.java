package asia.rxted.blog.modules.user.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultUtil;
import asia.rxted.blog.modules.token.config.Token;
import asia.rxted.blog.modules.user.config.UserRegister;
import asia.rxted.blog.model.dto.User;
import asia.rxted.blog.modules.user.service.UserServer;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

@Tag(name = "用户管理", description = "用户管理相关API")
@RestController()
@RequestMapping("users")
public class UserController {
    @Autowired
    private UserServer userServer;

    @Operation(summary = "根据用户名获取用户信息")
    @GetMapping("{username}")
    @Parameters({
            @Parameter(description = "用户名", required = true, name = "username")
    })
    public ResultMessage<User> getUser(@PathVariable String username) {
        return ResultUtil.data(userServer.findByUsername(username));
    }

    @Operation(summary = "用户注册")
    @PostMapping("/register")
    public ResultMessage<Object> registerUser(@RequestBody UserRegister register) {
        return userServer.saveUser(register);
    }

    @Operation(summary = "用户登录")
    @PostMapping("/login")
    public ResultMessage<Token> loginUser(
            @NotNull(message = "用户名不能为空") @RequestParam String username,
            @NotNull(message = "密码不能为空") @RequestParam String password,
            @RequestHeader String uuid) {
        return userServer.login(username, password);
    }

    @Operation(summary = "用户忘记密码")
    @PostMapping("/forget-password")
    public ResultMessage<Object> ForgetPassword(
            @NotNull(message = "手机号码不能为空") @RequestParam String phone) {
        return userServer.forgetPassword(phone);
    }

    @Operation(summary = "用户退出登录")
    @GetMapping("/exit/{username}")
    public ResultMessage<Object> logoutUser(@PathVariable String username) {
        return userServer.exit(username);
    }

    @Operation(summary = "用户注销")
    @GetMapping("/logout/{username}")
    public ResultMessage<Object> postMethodName(@PathVariable String username) {
        return userServer.logout(username);
    }

    @Operation(summary = "用户注销")
    @PutMapping("/update")
    public ResultMessage<Object> updateUser(@RequestBody User user) {
        return userServer.updateUser(user);
    }

}
