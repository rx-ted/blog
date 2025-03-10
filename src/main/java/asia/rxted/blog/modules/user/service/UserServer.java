package asia.rxted.blog.modules.user.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.config.base.Token;
import asia.rxted.blog.modules.user.config.UserRegister;
import asia.rxted.blog.modules.user.dto.User;

public interface UserServer extends IService<User> {
    // Pls add your different function.
    Token login(String username, String password);

    Token logout(String username);

    Token logout(int id);

    Token refreshToken(String refreshToken);

    void saveUser(UserRegister register);

    void resetPassword(String password, String newPassword);

    void updateUser(UserRegister register);

    User findByUsername(String username);

    IPage<User> getUserPage(Page page, QueryWrapper<User> wrapper);

}
