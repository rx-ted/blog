package asia.rxted.blog.modules.verification.service;

import asia.rxted.blog.modules.verification.config.VerificationEnum;

public interface VerificationService {

    Boolean check(String uuid, VerificationEnum verificationEnum);

    String cacheCheck(VerificationEnum verificationEnum, String uuid);
}