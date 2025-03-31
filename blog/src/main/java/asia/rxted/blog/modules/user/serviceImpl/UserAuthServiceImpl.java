package asia.rxted.blog.modules.user.serviceImpl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.transaction.annotation.Transactional;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultUtil;
import asia.rxted.blog.config.constant.CommonConstant;
import asia.rxted.blog.config.constant.RabbitMQConstant;
import asia.rxted.blog.config.constant.RedisConstant;
import asia.rxted.blog.config.enums.LoginTypeEnum;
import asia.rxted.blog.config.enums.RoleEnum;
import asia.rxted.blog.config.enums.UserAreaTypeEnum;
import asia.rxted.blog.mapper.UserAuthMapper;
import asia.rxted.blog.mapper.UserInfoMapper;
import asia.rxted.blog.mapper.UserRoleMapper;
import asia.rxted.blog.model.dto.EmailMsgDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.UserAdminDTO;
import asia.rxted.blog.model.dto.UserAreaDTO;
import asia.rxted.blog.model.dto.UserInfoDTO;
import asia.rxted.blog.model.dto.UserRole;
import asia.rxted.blog.model.entity.UserAuth;
import asia.rxted.blog.model.entity.UserInfo;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.PasswordVO;
import asia.rxted.blog.model.vo.QQLoginVO;
import asia.rxted.blog.model.vo.UserVO;
import asia.rxted.blog.modules.cache.CachePrefix;
import asia.rxted.blog.modules.cache.service.RedisService;
import asia.rxted.blog.modules.strategy.context.SocialLoginStrategyContext;
import asia.rxted.blog.modules.token.service.TokenService;
import asia.rxted.blog.modules.user.service.SiteUserInfoService;
import asia.rxted.blog.modules.user.service.UserAuthService;
import asia.rxted.blog.utils.CommonUtil;
import asia.rxted.blog.utils.PageUtil;
import asia.rxted.blog.utils.UserUtil;

public class UserAuthServiceImpl implements UserAuthService {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private RedisService redisService;

    @Autowired
    private UserAuthMapper userAuthMapper;

    @Autowired
    private UserInfoMapper userInfoMapper;

    @Autowired
    private SiteUserInfoService siteUserInfoService;

    @Autowired
    private UserRoleMapper userRoleMapper;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private SocialLoginStrategyContext socialLoginStrategyContext;

    @Override
    public void sendCode(String username) {
        if (!CommonUtil.checkEmail(username)) {
            ResultUtil.fail(ResultCode.EMAIL_FORMAT_ERROR);
        }
        String code = CommonUtil.getRandomCode();
        Map<String, Object> map = new HashMap<>();
        map.put("content", "您的验证码为 " + code + " 有效期15分钟，请不要告诉他人哦！");
        var emailDTO = EmailMsgDTO.builder()
                .email(username)
                .subject(CommonConstant.CAPTCHA)
                .template("common.html")
                .commentMap(map)
                .build();
        rabbitTemplate.convertAndSend(RabbitMQConstant.EMAIL_EXCHANGE, "*",
                new Message(JSON.toJSONBytes(emailDTO), new MessageProperties()));
        redisService.set(CachePrefix.EMAIL_CODE.getPrefix(username), code, RedisConstant.CODE_EXPIRE_TIME);

    }

    @Override
    public List<UserAreaDTO> listUserAreas(ConditionVO conditionVO) {
        List<UserAreaDTO> userAreaDTOs = new ArrayList<>();
        switch (Objects.requireNonNull(UserAreaTypeEnum.getUserAreaType(conditionVO.getType()))) {
            case USER:
                Object userArea = redisService.get(CachePrefix.USER_AREA.getPrefix());
                if (Objects.nonNull(userArea)) {
                    userAreaDTOs = JSON.parseObject(userArea.toString(), List.class);
                }
                return userAreaDTOs;
            case VISITOR:
                Map<String, Object> visitorArea = redisService.hGetAll(CachePrefix.VISITOR_AREA.getPrefix());
                if (Objects.nonNull(visitorArea)) {
                    userAreaDTOs = visitorArea.entrySet().stream()
                            .map(item -> UserAreaDTO.builder()
                                    .name(item.getKey())
                                    .value(Long.valueOf(item.getValue().toString()))
                                    .build())
                            .collect(Collectors.toList());
                }
                return userAreaDTOs;
            default:
                break;
        }
        return userAreaDTOs;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void register(UserVO userVO) {
        if (!CommonUtil.checkEmail(userVO.getUsername())) {
            ResultUtil.fail(ResultCode.EMAIL_FORMAT_ERROR);
        }
        if (checkUser(userVO)) {
            ResultUtil.fail(ResultCode.EMAIL_EXISTING);

        }
        UserInfo userInfo = UserInfo.builder()
                .email(userVO.getUsername())
                .nickname(CommonConstant.DEFAULT_NICKNAME + IdWorker.getId())
                .avatar(siteUserInfoService.getWebsiteConfig().getUserAvatar())
                .build();
        userInfoMapper.insert(userInfo);
        UserRole userRole = UserRole.builder()
                .userId(userInfo.getId())
                .roleId(RoleEnum.USER.getRoleId())
                .build();
        userRoleMapper.insert(userRole);
        UserAuth userAuth = UserAuth.builder()
                .userInfoId(userInfo.getId())
                .username(userVO.getUsername())
                .password(BCrypt.hashpw(userVO.getPassword(), BCrypt.gensalt()))
                .loginType(LoginTypeEnum.EMAIL.getType())
                .build();
        userAuthMapper.insert(userAuth);

    }

    @Override
    public void updatePassword(UserVO userVO) {
        if (!checkUser(userVO)) {
            ResultUtil.fail(ResultCode.EMAIL_NOT_EXISTING);
        }
        userAuthMapper.update(new UserAuth(), new LambdaUpdateWrapper<UserAuth>()
                .set(UserAuth::getPassword, BCrypt.hashpw(userVO.getPassword(), BCrypt.gensalt()))
                .eq(UserAuth::getUsername, userVO.getUsername()));

    }

    @Override
    public void updateAdminPassword(PasswordVO passwordVO) {
        UserAuth user = userAuthMapper.selectOne(new LambdaQueryWrapper<UserAuth>()
                .eq(UserAuth::getId, UserUtil.getUserDetailsDTO().getId()));
        if (Objects.nonNull(user) && BCrypt.checkpw(passwordVO.getOldPassword(), user.getPassword())) {
            UserAuth userAuth = UserAuth.builder()
                    .id(UserUtil.getUserDetailsDTO().getId())
                    .password(BCrypt.hashpw(passwordVO.getNewPassword(), BCrypt.gensalt()))
                    .build();
            userAuthMapper.updateById(userAuth);
        } else {
            ResultUtil.fail(ResultCode.USER_OLD_PASSWORD_ERROR);
        }
    }

    @Override
    public PageResultDTO<UserAdminDTO> listUsers(ConditionVO condition) {
        Integer count = userAuthMapper.countUser(condition);
        if (count == 0) {
            return new PageResultDTO<>();
        }
        List<UserAdminDTO> UserAdminDTOs = userAuthMapper.listUsers(PageUtil.getLimitCurrent(), PageUtil.getSize(),
                condition);
        return new PageResultDTO<>(UserAdminDTOs, Long.valueOf(count));
    }

    @Override
    public String logout() {
        tokenService.delLoginUser(UserUtil.getUserDetailsDTO().getId());
        return "注销成功";
    }

    @Override
    public UserInfoDTO qqLogin(QQLoginVO qqLoginVO) {
        return socialLoginStrategyContext.executeLoginStrategy(JSON.toJSONString(qqLoginVO), LoginTypeEnum.QQ);

    }

    private Boolean checkUser(UserVO user) {
        if (!user.getCode().equals(redisService.get(CachePrefix.EMAIL_CODE.getPrefix(user.getUsername())))) {
            ResultUtil.fail(ResultCode.VERIFICATION_ERROR);
        }
        UserAuth userAuth = userAuthMapper.selectOne(new LambdaQueryWrapper<UserAuth>()
                .select(UserAuth::getUsername)
                .eq(UserAuth::getUsername, user.getUsername()));
        return Objects.nonNull(userAuth);
    }

}
