package asia.rxted.blog.modules.strategy.impl.login;

import asia.rxted.blog.model.dto.UserDetailsDTO;
import asia.rxted.blog.model.dto.UserInfoDTO;
import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.config.constant.CommonConstant;
import asia.rxted.blog.modules.strategy.LoginStrategy;
import asia.rxted.blog.modules.token.service.TokenService;
import asia.rxted.blog.utils.BeanCopyUtil;

import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public abstract class AbstractLoginStrategyImpl implements LoginStrategy {

    @Autowired
    private TokenService tokenService;

    @Resource
    private HttpServletRequest request;

    @Override
    public ResultMessage<UserInfoDTO> login(String data) {
        ResultMessage<UserDetailsDTO> result = getUserDetailsDTO(data, request);
        if (!result.getCode().equals(200)) {
            ResultVO.error(result.getCode(), result.getMsg());
        }
        UserDetailsDTO userDetailsDTO = result.getData();
        if (userDetailsDTO.getIsDisable().equals(CommonConstant.TRUE)) {
            ResultVO.error(ResultCode.USER_IS_LOCKED);
        }
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userDetailsDTO, null,
                userDetailsDTO.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
        UserInfoDTO userInfoDTO = BeanCopyUtil.copyObject(userDetailsDTO, UserInfoDTO.class);
        String token = tokenService.createToken(userDetailsDTO);
        userInfoDTO.setToken(token);
        return ResultVO.data(userInfoDTO);
    }

    public abstract ResultMessage<UserDetailsDTO> getUserDetailsDTO(String data, HttpServletRequest request);

}
