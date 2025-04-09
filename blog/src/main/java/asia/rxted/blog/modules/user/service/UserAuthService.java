package asia.rxted.blog.modules.user.service;

import java.util.List;

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.UserAdminDTO;
import asia.rxted.blog.model.dto.UserAreaDTO;
import asia.rxted.blog.model.dto.UserInfoDTO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.UserLoginVO;
import asia.rxted.blog.model.vo.EmailVO;

public interface UserAuthService {
    ResultCode sendCode(String username);

    List<UserAreaDTO> listUserAreas(ConditionVO conditionVO);

    ResultCode register(EmailVO userVO);

    ResultCode updatePassword(EmailVO userVO);

    PageResultDTO<UserAdminDTO> listUsers(ConditionVO condition);

    ResultCode logout();

    ResultMessage<UserInfoDTO> login(UserLoginVO userLoginVO);
}
