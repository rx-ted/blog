package asia.rxted.blog.config.base;

import asia.rxted.blog.config.enums.UserRoleEnum;
import asia.rxted.blog.modules.token.config.JwtConfig;

public abstract class AbstractTokenGenerate<T> {

    public abstract JwtConfig createToken(T user, Boolean longTerm);

    public abstract JwtConfig refreshToken(String refreshToken);

    public UserRoleEnum role = UserRoleEnum.ROLE_ADMIN;
}
