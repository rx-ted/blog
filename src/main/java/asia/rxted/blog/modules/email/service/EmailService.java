package asia.rxted.blog.modules.email.service;

import asia.rxted.blog.common.ResultMessage;

public interface EmailService {

    ResultMessage<Object> sendCode(String to);

    void sendCode(String to, String subject, String text);

    ResultMessage<Object> verifyCode(String to, String code);
}
