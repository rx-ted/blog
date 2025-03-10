package asia.rxted.blog.modules.user.controller;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;

import asia.rxted.blog.common.ResultMessage;
import asia.rxted.blog.common.ResultUtil;
import asia.rxted.blog.modules.cache.RedisUtil;
import asia.rxted.blog.modules.user.config.UserRegister;
import asia.rxted.blog.modules.user.dto.User;
import asia.rxted.blog.modules.user.service.UserServer;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

@Tag(name = "用户管理", description = "用户管理相关API")
@RestController()
@RequestMapping("users")
public class UserController {
    @Autowired
    private UserServer userServer;

    @Autowired
    private RedisUtil redis;

    @Operation(summary = "根据用户名获取用户信息")
    @GetMapping("{username}")
    @Parameters({
            @Parameter(description = "用户名", required = true, name = "username")
    })
    public ResultMessage<List<User>> getUser(@PathVariable String username) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getUsername, username);
        List<User> users = userServer.list(wrapper);
        if (users.size() == 0) {
            return ResultUtil.data(new ArrayList<User>());
        }
        return ResultUtil.data(users);
    }

    @Operation(summary = "用户注册")
    @PostMapping("/register")
    public ResultMessage<Object> registerUser(@RequestBody UserRegister userRegister) {
        return null;
    }

    @Operation(summary = "用户登录")
    @PostMapping("/login")
    public ResultMessage<Object> loginUser(
            @NotNull(message = "用户名不能为空") @RequestParam String username,
            @NotNull(message = "密码不能为空") @RequestParam String password) {

        return null;
    }

    @Operation(summary = "用户忘记密码")
    @PostMapping("/forget-password")
    public ResultMessage<Object> ForgetPassword(
            @NotNull(message = "用户名不能为空") @RequestParam String username,
            @NotNull(message = "手机号码不能为空") @RequestParam String phone) {
        return null;
    }

    @Operation(summary = "用户退出登录")
    @PostMapping("/exit/{username}")
    public ResultMessage<Object> logoutUser(@PathVariable String username) {
        // userServer.logout(username);
        return null;
    }

    @Operation(summary = "用户注销")
    @PostMapping("/logout/{username}")
    public ResultMessage<Object> postMethodName(@PathVariable String username) {

        return null;
    }

}
