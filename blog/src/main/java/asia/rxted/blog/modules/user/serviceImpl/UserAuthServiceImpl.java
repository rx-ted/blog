package asia.rxted.blog.modules.user.serviceImpl;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.constant.CommonConstant;
import asia.rxted.blog.constant.RabbitMQConstant;
import asia.rxted.blog.enums.LoginTypeEnum;
import asia.rxted.blog.enums.RoleEnum;
import asia.rxted.blog.enums.UserAreaTypeEnum;
import asia.rxted.blog.mapper.UserAuthMapper;
import asia.rxted.blog.mapper.UserInfoMapper;
import asia.rxted.blog.mapper.UserRoleMapper;
import asia.rxted.blog.model.dto.EmailMsgDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.UserAdminDTO;
import asia.rxted.blog.model.dto.UserAreaDTO;
import asia.rxted.blog.model.dto.UserDetailsDTO;
import asia.rxted.blog.model.dto.UserInfoDTO;
import asia.rxted.blog.model.entity.UserAuth;
import asia.rxted.blog.model.entity.UserInfo;
import asia.rxted.blog.model.entity.UserRole;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.UserLoginVO;
import asia.rxted.blog.model.vo.EmailVO;
import asia.rxted.blog.model.vo.PasswordVO;
import asia.rxted.blog.modules.cache.CachePrefix;
import asia.rxted.blog.modules.cache.service.RedisService;
import asia.rxted.blog.modules.strategy.context.LoginStrategyContext;
import asia.rxted.blog.modules.token.service.TokenService;
import asia.rxted.blog.modules.user.service.SiteUserInfoService;
import asia.rxted.blog.modules.user.service.UserAuthService;
import asia.rxted.blog.utils.CommonUtil;
import asia.rxted.blog.utils.PageUtil;
import asia.rxted.blog.utils.UserUtil;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
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
    private LoginStrategyContext loginStrategyContext;

    BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public ResultCode sendCode(String username) {
        if (!CommonUtil.checkEmail(username)) {
            return ResultCode.EMAIL_FORMAT_ERROR;
        }
        String code = CommonUtil.getRandomCode();
        Map<String, Object> map = new HashMap<>();
        map.put("content", "您的验证码为 " + code + " 有效期15分钟，请不要告诉他人哦！");
        EmailMsgDTO emailDTO = EmailMsgDTO.builder()
                .email(username)
                .subject(CommonConstant.CAPTCHA)
                .template("common.html")
                .commentMap(map)
                .build();
        rabbitTemplate.convertAndSend(RabbitMQConstant.EMAIL_EXCHANGE, "*",
                new Message(JSON.toJSONBytes(emailDTO), new MessageProperties()));
        redisService.set(CachePrefix.EMAIL_CODE.join(username), code, CommonConstant.EMAIL_EXPIRE_TIME);
        return ResultCode.SUCCESS;
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
    public ResultCode register(EmailVO emailVO) {
        if (!CommonUtil.checkEmail(emailVO.getUsername())) {
            return ResultCode.EMAIL_FORMAT_ERROR;
        }

        Object code = redisService.get(CachePrefix.EMAIL_CODE.join(emailVO.getUsername()));
        if (Objects.isNull(code)) {
            return ResultCode.VERIFICATION_CODE_INVALID;
        } else if (!code.toString().equals(emailVO.getCode())) {
            return ResultCode.VERIFICATION_ERROR;
        }
        ResultCode rc = canRegisterUsername(emailVO);
        if (rc != ResultCode.SUCCESS) {
            return rc;
        }
        try {
            UserInfo userInfo = UserInfo.builder()
                    .username("UK_" + UUID.randomUUID().toString().replaceAll("-", ""))
                    .email(emailVO.getUsername())
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
                    .password(passwordEncoder.encode(emailVO.getPassword()))
                    .loginType(LoginTypeEnum.EMAIL.getType())
                    .build();
            userAuthMapper.insert(userAuth);
            redisService.del(CachePrefix.EMAIL_CODE.join(emailVO.getUsername()));
            return ResultCode.SUCCESS;
        } catch (Exception e) {
            System.out.println(e);
            return ResultCode.USER_REGISTER_ERROR;
        }

    }

    @Override
    public ResultCode updatePassword(EmailVO emailVO) {
        Object code = redisService.get(
                CachePrefix.EMAIL_CODE.join(
                        emailVO.getUsername()));

        if (Objects.isNull(code)) {
            return ResultCode.VERIFICATION_CODE_INVALID;

        } else if (code.toString().equals(emailVO.getCode())) {
            var result = checkUser(emailVO);
            if (!result.getCode().equals(200)) {
                return ResultCode.USER_EDIT_ERROR;
            }
            UserInfo userInfo = result.getData();
            userAuthMapper.update(new UserAuth(), new LambdaUpdateWrapper<UserAuth>()
                    .set(UserAuth::getUpdateTime, LocalDateTime.now())
                    .set(UserAuth::getPassword, passwordEncoder.encode(emailVO.getPassword()))
                    .eq(UserAuth::getUserInfoId, userInfo.getId()));
            return ResultCode.SUCCESS;
        } else {
            return ResultCode.VERIFICATION_ERROR;
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
    public ResultCode logout() {

        UserDetailsDTO userDetailsDTO = UserUtil.getUserDetailsDTO();

        if (Objects.nonNull(userDetailsDTO)) {
            tokenService.delLoginUser(userDetailsDTO.getId());
            return ResultCode.SUCCESS;
        } else {
            return ResultCode.USER_LOGOUT_ERROR;
        }
    }

    private ResultCode canRegisterUsername(EmailVO emailVO) {
        UserInfo userInfo = userInfoMapper.selectOne(
                new LambdaQueryWrapper<UserInfo>()
                        .eq(UserInfo::getEmail, emailVO.getUsername()));
        if (Objects.isNull(userInfo)) {
            return ResultCode.SUCCESS;
        }
        return ResultCode.USER_EXIST;
    }

    private ResultMessage<UserInfo> checkUser(EmailVO user) {
        UserInfo userInfo = userInfoMapper.selectOne(
                new LambdaQueryWrapper<UserInfo>()
                        .eq(UserInfo::getEmail, user.getUsername()));
        if (userInfo == null) {
            return ResultVO.error(ResultCode.USER_NOT_EXIST);
        }
        return ResultVO.data(userInfo);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserInfoDTO login(UserLoginVO userLoginVO) {
        return loginStrategyContext.executeLoginStrategy(
                JSON.toJSONString(userLoginVO.getLoginVO()),
                LoginTypeEnum.findObjectByType(userLoginVO.getType()));
    }

    @Override
    public ResultCode updateAdminPassword(PasswordVO passwordVO) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetailsDTO) {
            Integer id = ((UserDetailsDTO) principal).getId();
            UserAuth user = userAuthMapper.selectOne(new LambdaQueryWrapper<UserAuth>()
                    .eq(UserAuth::getId, id));
            if (Objects.nonNull(user) && BCrypt.checkpw(passwordVO.getOldPassword(), user.getPassword())) {
                UserAuth userAuth = UserAuth.builder()
                        .id(id)
                        .password(BCrypt.hashpw(passwordVO.getNewPassword(), BCrypt.gensalt()))
                        .build();
                userAuthMapper.updateById(userAuth);
                return ResultCode.SUCCESS;
            } else {
                return ResultCode.USER_PASSWORD_ERROR;
            }

        } else {
            return ResultCode.USER_NOT_LOGIN;
        }

    }

}
