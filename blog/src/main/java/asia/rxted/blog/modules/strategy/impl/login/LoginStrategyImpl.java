package asia.rxted.blog.modules.strategy.impl.login;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.support.SFunction;

import asia.rxted.blog.config.BizException;
import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.mapper.UserAuthMapper;
import asia.rxted.blog.mapper.UserInfoMapper;
import asia.rxted.blog.model.dto.UserDetailsDTO;
import asia.rxted.blog.model.entity.UserAuth;
import asia.rxted.blog.model.entity.UserInfo;
import asia.rxted.blog.model.vo.LoginVO;
import asia.rxted.blog.modules.cache.CachePrefix;
import asia.rxted.blog.modules.cache.service.RedisService;
import asia.rxted.blog.modules.user.serviceImpl.UserDetailServiceImpl;
import asia.rxted.blog.utils.IpUtil;
import jakarta.servlet.http.HttpServletRequest;

@Service("loginStrategyImpl")
public class LoginStrategyImpl extends AbstractLoginStrategyImpl {

    @Autowired
    private UserAuthMapper userAuthMapper;

    @Autowired
    private UserInfoMapper userInfoMapper;

    @Autowired
    private UserDetailServiceImpl userDetailsService;

    @Autowired
    private RedisService redisService;

    BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public UserDetailsDTO getUserDetailsDTO(String data, HttpServletRequest request, Integer loginType) {

        LoginVO loginVO = JSON.parseObject(data, LoginVO.class);

        UserInfo userInfo = loginHandler(loginVO, loginType);

        UserAuth userAuth = userAuthMapper.selectOne(
                new LambdaQueryWrapper<UserAuth>()
                        .eq(UserAuth::getUserInfoId, userInfo.getId()));
        if (userAuth == null) {
            throw new BizException(ResultCode.USER_CONNECT_LOGIN_ERROR);
        }

        if (!passwordEncoder.matches(loginVO.getPassword(), userAuth.getPassword())) {
            throw new BizException(ResultCode.USER_PASSWORD_ERROR);
        }

        String ipAddress = IpUtil.getIpAddress(request);
        String ipSource = IpUtil.getIpSource(ipAddress);

        // update user detail
        userAuthMapper.update(
                new UserAuth(),
                new LambdaUpdateWrapper<UserAuth>()
                        .set(UserAuth::getLastLoginTime, LocalDateTime.now())
                        .set(UserAuth::getLoginType, loginType)
                        .set(UserAuth::getIpAddress, ipAddress)
                        .set(UserAuth::getIpSource, ipSource)
                        .eq(UserAuth::getId, userAuth.getId()));
        return userDetailsService.convertUserDetail(userAuth, request);
    }

    private UserInfo loginHandler(LoginVO loginVO, Integer loginType) {

        // TODO(ben): will rephrase it.
        Map<Integer, CachePrefix> loginMap = Map.of(
                1, CachePrefix.SMS_CODE,
                2, CachePrefix.EMAIL_CODE);

        SFunction<UserInfo, ?> column = loginType == 1 ? UserInfo::getPhone
                : UserInfo::getEmail;

        var code = redisService.get(loginMap.get(loginType).join(loginVO.getUsername()));

        if (Objects.isNull(code)) {
            throw new BizException(ResultCode.VERIFICATION_CODE_INVALID);
        }
        if (!code.toString().equals(loginVO.getCode())) {
            throw new BizException(ResultCode.VERIFICATION_ERROR);
        }
        UserInfo userInfo = userInfoMapper.selectOne(new LambdaQueryWrapper<UserInfo>()
                .eq(column, loginVO.getUsername()));

        if (Objects.isNull(userInfo)) {
            throw new BizException(ResultCode.USER_NOT_EXIST);
        }
        redisService.del(loginMap.get(loginType).join(loginVO.getUsername()));
        return userInfo;
    }

}
