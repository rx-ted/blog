package asia.rxted.blog.modules.user.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.modules.token.config.Token;
import asia.rxted.blog.modules.user.config.UserRegister;
import asia.rxted.blog.model.dto.User;

public interface UserServer extends IService<User> {
    // Pls add your different function.
    ResultMessage<Token> login(String username, String password);

    ResultMessage<Object> logout(String username);

    ResultMessage<Object> logout(int id);

    ResultMessage<Object> exit(String username);

    Token refreshToken(String refreshToken);

    ResultMessage<Object> saveUser(UserRegister register);

    ResultMessage<Object> resetPassword(int id, String password, String newPassword);

    ResultMessage<Object> resetPassword(String username, String password, String newPassword);

    ResultMessage<Object> forgetPassword(String phone);

    ResultMessage<Object> updateUser(User updater);

    User findByUsername(String username);

    IPage<User> getUserPage(Page page, QueryWrapper<User> wrapper);

}
