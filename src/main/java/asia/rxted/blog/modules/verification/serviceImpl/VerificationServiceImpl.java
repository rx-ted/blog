package asia.rxted.blog.modules.verification.serviceImpl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import asia.rxted.blog.common.ResultCode;
import asia.rxted.blog.common.ServiceException;
import asia.rxted.blog.modules.cache.Cache;
import asia.rxted.blog.modules.cache.CachePrefix;
import asia.rxted.blog.modules.verification.config.VerificationEnum;
import asia.rxted.blog.modules.verification.service.VerificationService;

@Service
public class VerificationServiceImpl implements VerificationService {
    @Autowired
    private Cache cache;

    public Boolean check(String uuid, VerificationEnum verificationEnum) {
        if (Boolean.TRUE.equals(cache.remove(cacheCheck(verificationEnum, uuid)))) {
            return true;
        }
        throw new ServiceException(ResultCode.VERIFICATION_CODE_INVALID);
    }

    public String cacheCheck(VerificationEnum verificationEnum, String uuid) {
        return CachePrefix.VERIFICATION_RESULT.getPrefix() + verificationEnum.name()
                + uuid;
    }

}
