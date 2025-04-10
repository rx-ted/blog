package asia.rxted.blog.modules.strategy.impl.login;

import asia.rxted.blog.model.dto.UserDetailsDTO;
import asia.rxted.blog.model.dto.UserInfoDTO;
import asia.rxted.blog.config.BizException;
import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.constant.CommonConstant;
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
    public UserInfoDTO login(String data, Integer loginType) {

        UserDetailsDTO userDetailsDTO = getUserDetailsDTO(data, request, loginType);
        if (userDetailsDTO.getIsDisable().equals(CommonConstant.TRUE)) {
            throw new BizException(ResultCode.USER_IS_LOCKED);
        }
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userDetailsDTO, null,
                userDetailsDTO.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);

        UserInfoDTO userInfoDTO = BeanCopyUtil.copyObject(userDetailsDTO, UserInfoDTO.class);
        String token = tokenService.createToken(userDetailsDTO);
        userInfoDTO.setToken(token);

        return userInfoDTO;
    }

    public abstract UserDetailsDTO getUserDetailsDTO(String data, HttpServletRequest request,
            Integer loginType);

}
