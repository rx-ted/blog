package asia.rxted.blog.modules.user.serviceImpl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.common.ResultCode;
import asia.rxted.blog.common.ResultMessage;
import asia.rxted.blog.common.ResultUtil;
import asia.rxted.blog.common.ServiceException;
import asia.rxted.blog.config.base.Token;
import asia.rxted.blog.modules.system.token.ManageTokenGenerate;
import asia.rxted.blog.modules.user.config.UserRegister;
import asia.rxted.blog.modules.user.dto.User;
import asia.rxted.blog.modules.user.mapper.UserMapper;
import asia.rxted.blog.modules.user.service.UserServer;
import asia.rxted.blog.modules.verification.config.VerificationEnum;
import asia.rxted.blog.modules.verification.service.VerificationService;

@Service
public class UserServerImpl extends ServiceImpl<UserMapper, User> implements UserServer {

    @Autowired
    private VerificationService verificationService;

    @Autowired
    private ManageTokenGenerate manageTokenGenerate;

    @Override
    public ResultMessage<Token> login(String username, String password) {
        User user = this.findByUsername(username);
        if (user == null || !user.getStatus())
            return ResultUtil.error(ResultCode.USER_NOT_EXIST);
        // if (!new BCryptPasswordEncoder().matches(password, user.getPassword()))
        // throw new ServiceException(ResultCode.USER_PASSWORD_ERROR);
        if (!password.equals(user.getPassword()))
            return ResultUtil.error(ResultCode.USER_PASSWORD_ERROR);
        try {
            return ResultUtil.data(manageTokenGenerate.createToken(user, false));

        } catch (Exception e) {
            log.error("登录错误：", e);
        }
        return ResultUtil.error();

    }

    @Override
    public Token logout(String username) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'logout'");
    }

    @Override
    public Token logout(int id) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'logout'");
    }

    @Override
    public Token refreshToken(String refreshToken) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'refreshToken'");
    }

    @Override
    public void saveUser(UserRegister register) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'saveUser'");
    }

    @Override
    public void resetPassword(String password, String newPassword) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'resetPassword'");
    }

    @Override
    public void updateUser(UserRegister register) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'updateUser'");
    }

    @Override
    public User findByUsername(String username) {
        return getOne(new LambdaQueryWrapper<User>().eq(User::getUsername, username), false);
    }

    @Override
    public IPage<User> getUserPage(Page page, QueryWrapper<User> wrapper) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'getUserPage'");
    }

}
