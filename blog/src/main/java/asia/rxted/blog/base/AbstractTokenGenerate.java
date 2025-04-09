package asia.rxted.blog.base;

import asia.rxted.blog.enums.UserRoleEnum;
import asia.rxted.blog.modules.token.config.JwtConfig;

public abstract class AbstractTokenGenerate<T> {

    public abstract JwtConfig createToken(T user, Boolean longTerm);

    public abstract JwtConfig refreshToken(String refreshToken);

    public UserRoleEnum role = UserRoleEnum.ROLE_ADMIN;
}
