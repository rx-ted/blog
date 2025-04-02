package asia.rxted.blog.modules.user.service;

import java.util.List;

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.UserAdminDTO;
import asia.rxted.blog.model.dto.UserAreaDTO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.PasswordVO;
import asia.rxted.blog.model.vo.UserVO;

public interface UserAuthService {
    ResultCode sendCode(String username);

    List<UserAreaDTO> listUserAreas(ConditionVO conditionVO);

    ResultCode register(UserVO userVO);

    ResultCode updatePassword(UserVO userVO);

    ResultCode updateAdminPassword(PasswordVO passwordVO);

    PageResultDTO<UserAdminDTO> listUsers(ConditionVO condition);

    ResultCode logout();
}
