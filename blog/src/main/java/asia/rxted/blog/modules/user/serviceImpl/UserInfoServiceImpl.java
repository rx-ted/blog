package asia.rxted.blog.modules.user.serviceImpl;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.google.common.base.Strings;

import asia.rxted.blog.config.BizException;
import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.mapper.UserAuthMapper;
import asia.rxted.blog.mapper.UserInfoMapper;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.UserDetailsDTO;
import asia.rxted.blog.model.dto.UserInfoDTO;
import asia.rxted.blog.model.dto.UserOnlineDTO;
import asia.rxted.blog.model.entity.UserAuth;
import asia.rxted.blog.model.entity.UserInfo;
import asia.rxted.blog.model.entity.UserRole;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.EmailVO;
import asia.rxted.blog.model.vo.SubscribeVO;
import asia.rxted.blog.model.vo.UserDisableVO;
import asia.rxted.blog.model.vo.UserInfoVO;
import asia.rxted.blog.model.vo.UserRoleVO;
import asia.rxted.blog.modules.cache.CachePrefix;
import asia.rxted.blog.modules.cache.service.RedisService;
import asia.rxted.blog.modules.token.service.TokenService;
import asia.rxted.blog.modules.user.service.UserInfoService;
import asia.rxted.blog.modules.user.service.UserRoleService;
import asia.rxted.blog.utils.BeanCopyUtil;
import asia.rxted.blog.utils.PageUtil;
import asia.rxted.blog.utils.UserUtil;

@Service
public class UserInfoServiceImpl extends ServiceImpl<UserInfoMapper, UserInfo> implements UserInfoService {
    @Autowired
    private UserInfoMapper userInfoMapper;

    @Autowired
    private UserAuthMapper userAuthMapper;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private RedisService redisService;

    @Autowired
    private UserRoleService userRoleService;

    @Transactional(rollbackFor = Exception.class)
    @Override
    public ResultCode updateUserInfo(UserInfoVO userInfoVO) {

        UserInfo userInfo = UserInfo.builder()
                .id(UserUtil.getUserDetailsDTO().getUserInfoId())
                .nickname(userInfoVO.getNickname())
                .intro(userInfoVO.getIntro())
                .website(userInfoVO.getWebsite())
                .build();
        userInfoMapper.updateById(userInfo);
        return ResultCode.SUCCESS;
    }

    @Override
    public String updateUserAvatar(MultipartFile file) {
        // String avatar = uploadStrategyContext.executeUploadStrategy(file,
        // FilePathEnum.AVATAR.getPath());
        // UserInfo userInfo = UserInfo.builder()
        // .id(UserUtil.getUserDetailsDTO().getUserInfoId())
        // .avatar(avatar)
        // .build();
        // userInfoMapper.updateById(userInfo);
        // return avatar;
        return null;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public ResultCode saveUserEmail(EmailVO emailVO) {
        if (Objects.isNull(redisService.get(CachePrefix.EMAIL_CODE.join(emailVO.getUsername())))) {
            throw new BizException("验证码错误");
        }
        if (!emailVO.getCode().equals(redisService.get(
                CachePrefix.EMAIL_CODE.join(emailVO.getUsername())).toString())) {
            throw new BizException("验证码错误！");
        }
        UserInfo userInfo = UserInfo.builder()
                .id(UserUtil.getUserDetailsDTO().getUserInfoId())
                .email(emailVO.getUsername())
                .build();
        userInfoMapper.updateById(userInfo);
        return ResultCode.SUCCESS;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public ResultCode updateUserSubscribe(SubscribeVO subscribeVO) {
        UserInfo temp = userInfoMapper
                .selectOne(new LambdaQueryWrapper<UserInfo>().eq(UserInfo::getId, subscribeVO.getUserId()));
        if (Strings.isNullOrEmpty(temp.getEmail())) {
            throw new BizException("邮箱未绑定！");
        }
        UserInfo userInfo = UserInfo.builder()
                .id(subscribeVO.getUserId())
                .isSubscribe(subscribeVO.getIsSubscribe())
                .build();
        userInfoMapper.updateById(userInfo);
        return ResultCode.SUCCESS;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public ResultCode updateUserRole(UserRoleVO userRoleVO) {
        UserInfo userInfo = UserInfo.builder()
                .id(userRoleVO.getUserInfoId())
                .nickname(userRoleVO.getNickname())
                .build();
        userInfoMapper.updateById(userInfo);
        userRoleService.remove(new LambdaQueryWrapper<UserRole>()
                .eq(UserRole::getUserId, userRoleVO.getUserInfoId()));
        List<UserRole> userRoleList = userRoleVO.getRoleIds().stream()
                .map(roleId -> UserRole.builder()
                        .roleId(roleId)
                        .userId(userRoleVO.getUserInfoId())
                        .build())
                .collect(Collectors.toList());
        userRoleService.saveBatch(userRoleList);
        return ResultCode.SUCCESS;

    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public ResultCode updateUserDisable(UserDisableVO userDisableVO) {
        removeOnlineUser(userDisableVO.getId());
        UserInfo userInfo = UserInfo.builder()
                .id(userDisableVO.getId())
                .isDisable(userDisableVO.getIsDisable())
                .build();
        userInfoMapper.updateById(userInfo);
        return ResultCode.SUCCESS;
    }

    @Override
    public PageResultDTO<UserOnlineDTO> listOnlineUsers(ConditionVO conditionVO) {
        Map<String, Object> userMaps = redisService.hGetAll("login_user");
        Collection<Object> values = userMaps.values();
        ArrayList<UserDetailsDTO> userDetailsDTOs = new ArrayList<>();
        for (Object value : values) {
            userDetailsDTOs.add((UserDetailsDTO) value);
        }
        List<UserOnlineDTO> userOnlineDTOs = BeanCopyUtil.copyList(userDetailsDTOs, UserOnlineDTO.class);
        List<UserOnlineDTO> onlineUsers = userOnlineDTOs.stream()
                .filter(item -> Strings.isNullOrEmpty(conditionVO.getKeywords())
                        || item.getNickname().contains(conditionVO.getKeywords()))
                .sorted(Comparator.comparing(UserOnlineDTO::getLastLoginTime).reversed())
                .collect(Collectors.toList());
        int fromIndex = PageUtil.getLimitCurrent().intValue();
        int size = PageUtil.getSize().intValue();
        int toIndex = onlineUsers.size() - fromIndex > size ? fromIndex + size : onlineUsers.size();
        List<UserOnlineDTO> userOnlineList = onlineUsers.subList(fromIndex, toIndex);
        return new PageResultDTO<>(userOnlineList, Long.valueOf(onlineUsers.size()));
    }

    @Override
    public ResultCode removeOnlineUser(Integer userInfoId) {
        Integer userId = userAuthMapper
                .selectOne(new LambdaQueryWrapper<UserAuth>().eq(UserAuth::getUserInfoId, userInfoId)).getId();
        tokenService.delLoginUser(userId);
        return ResultCode.SUCCESS;
    }

    @Override
    public UserInfoDTO getUserInfoById(Integer id) {
        UserInfo userInfo = userInfoMapper.selectById(id);
        return BeanCopyUtil.copyObject(userInfo, UserInfoDTO.class);
    }

}
