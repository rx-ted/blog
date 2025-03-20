package asia.rxted.blog.modules.strategy.serviceImpl;

import com.alibaba.fastjson.JSON;

import asia.rxted.blog.common.ResultCode;
import asia.rxted.blog.common.ResultUtil;
import asia.rxted.blog.common.enums.LoginTypeEnum;
import asia.rxted.blog.config.constant.SocialLoginConstant;
import asia.rxted.blog.config.properties.QQConfigProperties;
import asia.rxted.blog.modules.strategy.dto.SocialTokenDTO;
import asia.rxted.blog.modules.strategy.dto.SocialUserInfoDTO;
import asia.rxted.blog.modules.user.dto.QQTokenDTO;
import asia.rxted.blog.modules.user.dto.QQUserInfoDTO;
import asia.rxted.blog.modules.user.vo.QQLoginVO;
import asia.rxted.blog.utils.CommonUtil;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Service("qqLoginStrategyImpl")
public class QQLoginStrategyImpl extends AbstractSocialLoginStrategyImpl {

    @Autowired
    private QQConfigProperties qqConfigProperties;

    @Autowired
    private RestTemplate restTemplate;

    @Override
    public SocialTokenDTO getSocialToken(String data) {
        QQLoginVO qqLoginVO = JSON.parseObject(data, QQLoginVO.class);
        checkQQToken(qqLoginVO);
        return SocialTokenDTO.builder()
                .openId(qqLoginVO.getOpenId())
                .accessToken(qqLoginVO.getAccessToken())
                .loginType(LoginTypeEnum.QQ.getType())
                .build();
    }

    @Override
    public SocialUserInfoDTO getSocialUserInfo(SocialTokenDTO socialTokenDTO) {
        Map<String, String> formData = new HashMap<>(3);
        formData.put(SocialLoginConstant.QQ_OPEN_ID, socialTokenDTO.getOpenId());
        formData.put(SocialLoginConstant.ACCESS_TOKEN, socialTokenDTO.getAccessToken());
        formData.put(SocialLoginConstant.OAUTH_CONSUMER_KEY, qqConfigProperties.getAppId());
        QQUserInfoDTO qqUserInfoDTO = JSON.parseObject(
                restTemplate.getForObject(qqConfigProperties.getUserInfoUrl(), String.class, formData),
                QQUserInfoDTO.class);
        return SocialUserInfoDTO.builder()
                .nickname(Objects.requireNonNull(qqUserInfoDTO).getNickname())
                .avatar(qqUserInfoDTO.getFigureurl_qq_1())
                .build();
    }

    private void checkQQToken(QQLoginVO qqLoginVO) {
        Map<String, String> qqData = new HashMap<>(1);
        qqData.put(SocialLoginConstant.ACCESS_TOKEN, qqLoginVO.getAccessToken());
        try {
            String result = restTemplate.getForObject(qqConfigProperties.getCheckTokenUrl(), String.class, qqData);
            QQTokenDTO qqTokenDTO = JSON.parseObject(CommonUtil.getBracketsContent(Objects.requireNonNull(result)),
                    QQTokenDTO.class);
            if (!qqLoginVO.getOpenId().equals(qqTokenDTO.getOpenid())) {
                ResultUtil.fail(ResultCode.QQ_LOGIN_ERROR);
            }
        } catch (Exception e) {
            e.printStackTrace();
            ResultUtil.fail(ResultCode.QQ_LOGIN_ERROR);
        }
    }

}
