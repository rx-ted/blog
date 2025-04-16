package asia.rxted.blog.modules.user.service;

import org.springframework.web.multipart.MultipartFile;

import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.UserInfoDTO;
import asia.rxted.blog.model.dto.UserOnlineDTO;
import asia.rxted.blog.model.entity.UserInfo;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.EmailVO;
import asia.rxted.blog.model.vo.SubscribeVO;
import asia.rxted.blog.model.vo.UserDisableVO;
import asia.rxted.blog.model.vo.UserInfoVO;
import asia.rxted.blog.model.vo.UserRoleVO;

public interface UserInfoService extends IService<UserInfo> {

    ResultCode updateUserInfo(UserInfoVO userInfoVO);

    String updateUserAvatar(MultipartFile file);

    ResultCode saveUserEmail(EmailVO emailVO);

    ResultCode updateUserSubscribe(SubscribeVO subscribeVO);

    ResultCode updateUserRole(UserRoleVO userRoleVO);

    ResultCode updateUserDisable(UserDisableVO userDisableVO);

    PageResultDTO<UserOnlineDTO> listOnlineUsers(ConditionVO conditionVO);

    ResultCode removeOnlineUser(Integer userInfoId);

    UserInfoDTO getUserInfoById(Integer id);
}
