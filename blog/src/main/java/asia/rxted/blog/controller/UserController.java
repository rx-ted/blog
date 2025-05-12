package asia.rxted.blog.controller;

import static asia.rxted.blog.constant.OptTypeConstant.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import asia.rxted.blog.annotation.AccessLimit;
import asia.rxted.blog.annotation.OptLog;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.model.vo.UserLoginVO;
import asia.rxted.blog.model.dto.UserInfoDTO;
import asia.rxted.blog.model.vo.EmailVO;
import asia.rxted.blog.model.vo.SubscribeVO;
import asia.rxted.blog.model.vo.UserInfoVO;
import asia.rxted.blog.modules.user.service.UserAuthService;
import asia.rxted.blog.modules.user.service.UserInfoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@Tag(name = "用户管理", description = "用户管理相关API")
@RestController()
@RequestMapping("user")
public class UserController {

    @Autowired
    private UserInfoService userInfoService;

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
    @PostMapping("register")
    public ResultMessage<Object> registerUser(@RequestBody EmailVO userVO) {
        return ResultVO.status(userAuthService.register(userVO));
    }

    @OptLog(optType = UPDATE)
    @Operation(summary = "修改密码")
    @PostMapping("password")
    public ResultMessage<Object> ForgetPassword(@Valid @RequestBody EmailVO userVO) {
        return ResultVO.status(userAuthService.updatePassword(userVO));
    }

    @OptLog(optType = DELETE)
    @Operation(summary = "用户登出")
    @GetMapping("logout")
    public ResultMessage<Object> logout() {
        return ResultVO.status(userAuthService.logout());
    }

    @OptLog(optType = SAVE)
    @Operation(summary = "用户登录")
    @PostMapping("login")
    public ResultMessage<?> login(@RequestBody UserLoginVO dto) {
        return ResultVO.data(userAuthService.login(dto));
    }

    @OptLog(optType = UPDATE)
    @Operation(summary = "更新用户信息")
    @PutMapping("info")
    public ResultMessage<?> updateUserInfo(@Valid @RequestBody UserInfoVO userInfoVO) {
        return ResultVO.status(
                userInfoService.updateUserInfo(userInfoVO));
    }

    @OptLog(optType = UPDATE)
    @Operation(summary = "更新用户头像")
    @Parameter(name = "file", description = "用户头像", required = true)
    @PostMapping("avatar")
    public ResultMessage<String> updateUserAvatar(MultipartFile file) {
        return ResultVO.data(userInfoService.updateUserAvatar(file));
    }

    @OptLog(optType = UPDATE)
    @Operation(summary = "绑定用户邮箱")
    @PutMapping("email")
    public ResultMessage<?> saveUserEmail(@Valid @RequestBody EmailVO emailVO) {
        return ResultVO.status(userInfoService.saveUserEmail(emailVO));
    }

    @OptLog(optType = UPDATE)
    @Operation(summary = "修改用户的订阅状态")
    @PutMapping("subscribe")
    public ResultMessage<?> updateUserSubscribe(@RequestBody SubscribeVO subscribeVO) {
        return ResultVO.status(userInfoService.updateUserSubscribe(subscribeVO));
    }

    @Operation(summary = "根据id获取用户信息")
    @GetMapping("info/{userInfoId}")
    public ResultMessage<UserInfoDTO> getUserInfoById(@PathVariable("userInfoId") Integer userInfoId) {
        return ResultVO.data(userInfoService.getUserInfoById(userInfoId));
    }

}
