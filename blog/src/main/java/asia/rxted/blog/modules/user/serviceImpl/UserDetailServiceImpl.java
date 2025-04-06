package asia.rxted.blog.modules.user.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.mapper.RoleMapper;
import asia.rxted.blog.mapper.UserAuthMapper;
import asia.rxted.blog.mapper.UserInfoMapper;
import asia.rxted.blog.model.dto.UserDetailsDTO;
import asia.rxted.blog.model.entity.UserAuth;
import asia.rxted.blog.model.entity.UserInfo;
import asia.rxted.blog.utils.IpUtil;
import eu.bitwalker.useragentutils.UserAgent;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import lombok.SneakyThrows;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
public class UserDetailServiceImpl implements UserDetailsService {

    @Autowired
    private UserAuthMapper userAuthMapper;

    @Autowired
    private UserInfoMapper userInfoMapper;

    @Autowired
    private RoleMapper roleMapper;

    @Resource
    private HttpServletRequest request;

    @SneakyThrows
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        if (StringUtils.isBlank(username)) {
            ResultVO.fail(ResultCode.USER_NOT_EMPTY);
            return null;
        }
        UserInfo userInfo = userInfoMapper.selectOne(
                new LambdaQueryWrapper<UserInfo>()
                        .eq(UserInfo::getUsername, username));
        if (userInfo == null) {
            ResultVO.fail(ResultCode.USER_NOT_EXIST);
            return null;
        }
        UserAuth userAuth = userAuthMapper.selectOne(new LambdaQueryWrapper<UserAuth>()
                .select(UserAuth::getId, UserAuth::getUserInfoId, UserAuth::getPassword,
                        UserAuth::getLoginType)
                .eq(UserAuth::getUserInfoId, userInfo.getId()));
        if (Objects.isNull(userAuth)) {
            ResultVO.fail(ResultCode.USER_CONNECT_LOGIN_ERROR);
            return null;
        }
        return convertUserDetail(userAuth, request);
    }

    public UserDetailsDTO convertUserDetail(UserAuth user, HttpServletRequest request) {
        UserInfo userInfo = userInfoMapper.selectById(user.getUserInfoId());
        List<String> roles = roleMapper.listRolesByUserInfoId(userInfo.getId());
        String ipAddress = IpUtil.getIpAddress(request);
        String ipSource = IpUtil.getIpSource(ipAddress);
        UserAgent userAgent = IpUtil.getUserAgent(request);
        return UserDetailsDTO.builder()
                .id(user.getId())
                .loginType(user.getLoginType())
                .userInfoId(userInfo.getId())
                .username(userInfo.getUsername())
                .password(user.getPassword())
                .phone(userInfo.getPhone())
                .email(userInfo.getEmail())
                .roles(roles)
                .nickname(userInfo.getNickname())
                .avatar(userInfo.getAvatar())
                .intro(userInfo.getIntro())
                .website(userInfo.getWebsite())
                .isSubscribe(userInfo.getIsSubscribe())
                .ipAddress(ipAddress)
                .ipSource(ipSource)
                .isDisable(userInfo.getIsDisable())
                .browser(userAgent.getBrowser().getName())
                .os(userAgent.getOperatingSystem().getName())
                .lastLoginTime(LocalDateTime.now())
                .build();
    }

}
