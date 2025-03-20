package asia.rxted.blog.config.base;

import asia.rxted.blog.modules.token.config.Token;
import asia.rxted.blog.modules.user.config.UserRoleEnum;

public abstract class AbstractTokenGenerate<T> {

    public abstract Token createToken(T user, Boolean longTerm);

    public abstract Token refreshToken(String refreshToken);

    public UserRoleEnum role = UserRoleEnum.ROLE_ADMIN;
}
