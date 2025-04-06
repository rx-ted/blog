package asia.rxted.blog.modules.strategy.impl.login;

import java.time.LocalDateTime;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.config.enums.LoginTypeEnum;
import asia.rxted.blog.mapper.UserAuthMapper;
import asia.rxted.blog.mapper.UserInfoMapper;
import asia.rxted.blog.model.dto.UserDetailsDTO;
import asia.rxted.blog.model.entity.UserAuth;
import asia.rxted.blog.model.entity.UserInfo;
import asia.rxted.blog.model.vo.EmailLoginVO;
import asia.rxted.blog.modules.user.serviceImpl.UserDetailServiceImpl;
import asia.rxted.blog.utils.IpUtil;
import jakarta.servlet.http.HttpServletRequest;

@Service("emailLoginStrategyImpl")
public class EmailLoginStrategyImpl extends AbstractLoginStrategyImpl {

    @Autowired
    private UserAuthMapper userAuthMapper;

    @Autowired
    private UserInfoMapper userInfoMapper;

    @Autowired
    private UserDetailServiceImpl userDetailsService;

    @Override
    public ResultMessage<UserDetailsDTO> getUserDetailsDTO(String data, HttpServletRequest request) {
        EmailLoginVO emailLoginVO = JSON.parseObject(data, EmailLoginVO.class);
        UserInfo userInfo = userInfoMapper.selectOne(new LambdaQueryWrapper<UserInfo>()
                .eq(UserInfo::getEmail, emailLoginVO.getUsername()));
        if (Objects.isNull(userInfo)) {
            return ResultVO.status(ResultCode.USER_NOT_EXIST);
        }

        LambdaQueryWrapper<UserAuth> wrapper = new LambdaQueryWrapper<UserAuth>()
                .eq(UserAuth::getUserInfoId, userInfo.getId())
                .eq(UserAuth::getPassword, emailLoginVO.getPassword());
        UserAuth result = userAuthMapper.selectOne(wrapper);
        if (result == null) {
            return ResultVO.status(ResultCode.PASSWORD_ERROR);
        }

        String ipAddress = IpUtil.getIpAddress(request);
        String ipSource = IpUtil.getIpSource(ipAddress);

        // update user detail
        userAuthMapper.update(
                new UserAuth(),
                new LambdaUpdateWrapper<UserAuth>()
                        .set(UserAuth::getLastLoginTime, LocalDateTime.now())
                        .set(UserAuth::getLoginType, LoginTypeEnum.EMAIL.getType())
                        .set(UserAuth::getIpAddress, ipAddress)
                        .set(UserAuth::getIpSource, ipSource)
                        .eq(UserAuth::getId, result.getId()));
        return ResultVO.data(userDetailsService.convertUserDetail(result, request));
    }

}
