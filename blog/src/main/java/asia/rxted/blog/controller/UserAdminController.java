package asia.rxted.blog.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import asia.rxted.blog.annotation.OptLog;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.UserAdminDTO;
import asia.rxted.blog.model.dto.UserAreaDTO;
import asia.rxted.blog.model.dto.UserOnlineDTO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.PasswordVO;
import asia.rxted.blog.model.vo.UserDisableVO;
import asia.rxted.blog.model.vo.UserRoleVO;
import asia.rxted.blog.modules.user.service.UserAuthService;
import asia.rxted.blog.modules.user.service.UserInfoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

import static asia.rxted.blog.constant.OptTypeConstant.*;

@Schema(name = "用户admin管理模块")
@RestController
@RequestMapping("admin")
public class UserAdminController {

    @Autowired
    private UserAuthService userAuthService;

    @Autowired
    private UserInfoService userInfoService;

    @Operation(summary = "获取用户区域分布")
    @GetMapping("users/area")
    public ResultMessage<List<UserAreaDTO>> listUserAreas(ConditionVO conditionVO) {
        return ResultVO.data(userAuthService.listUserAreas(conditionVO));
    }

    @Operation(summary = "查询后台用户列表")
    @GetMapping("users")
    public ResultMessage<PageResultDTO<UserAdminDTO>> listUsers(ConditionVO conditionVO) {
        return ResultVO.data(userAuthService.listUsers(conditionVO));
    }

    @OptLog(optType = UPDATE)
    @Operation(summary = "修改管理员密码")
    @PutMapping("users/password")
    public ResultMessage<?> updateAdminPassword(@Valid @RequestBody PasswordVO passwordVO) {
        return ResultVO.status(userAuthService.updateAdminPassword(passwordVO));
    }

    @Operation(summary = "查看在线用户")
    @GetMapping("users/online")
    public ResultMessage<PageResultDTO<UserOnlineDTO>> listOnlineUsers(ConditionVO conditionVO) {
        return ResultVO.data(userInfoService.listOnlineUsers(conditionVO));
    }

    @OptLog(optType = UPDATE)
    @Operation(summary = "修改用户角色")
    @PutMapping("users/role")
    public ResultMessage<?> updateUserRole(@Valid @RequestBody UserRoleVO userRoleVO) {
        return ResultVO.status(userInfoService.updateUserRole(userRoleVO));
    }

    @OptLog(optType = UPDATE)
    @Operation(summary = "修改用户禁用状态")
    @PutMapping("users/disable")
    public ResultMessage<?> updateUserDisable(@Valid @RequestBody UserDisableVO userDisableVO) {
        return ResultVO.status(userInfoService.updateUserDisable(userDisableVO));
    }

    @OptLog(optType = DELETE)
    @Operation(summary = "下线用户")
    @DeleteMapping("users/{userInfoId}/online")
    public ResultMessage<?> removeOnlineUser(@PathVariable("userInfoId") Integer userInfoId) {
        return ResultVO.status(userInfoService.removeOnlineUser(userInfoId));
    }

}
