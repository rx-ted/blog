package asia.rxted.blog.modules.system.token;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import asia.rxted.blog.config.base.AbstractTokenGenerate;
import asia.rxted.blog.config.base.Token;
import asia.rxted.blog.config.base.TokenUtil;
import asia.rxted.blog.modules.user.config.AuthUser;
import asia.rxted.blog.modules.user.dto.User;

@Service
public class ManageTokenGenerate extends AbstractTokenGenerate<User> {
    @Autowired
    TokenUtil token;

    @Override
    public Token createToken(User user, Boolean longTerm) {
        AuthUser authUser = AuthUser.builder()
                .username(user.getUsername())
                .id(user.getId().toString())
                .face(user.getAvatar())
                .nickName(user.getNick_name())
                .isSuper(user.is_super())
                .longTerm(longTerm)
                .build();
        return token.createToken(authUser);
    }

    @Override
    public Token refreshToken(String refreshToken) {
        return token.refreshToken(refreshToken);
    }

}
