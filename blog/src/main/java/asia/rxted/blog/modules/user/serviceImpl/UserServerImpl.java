package asia.rxted.blog.modules.user.serviceImpl;

import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.common.ResultCode;
import asia.rxted.blog.common.ResultMessage;
import asia.rxted.blog.common.ResultUtil;
import asia.rxted.blog.modules.system.token.ManageTokenGenerate;
import asia.rxted.blog.modules.token.config.Token;
import asia.rxted.blog.modules.user.config.UserRegister;
import asia.rxted.blog.modules.user.dto.User;
import asia.rxted.blog.modules.user.mapper.UserMapper;
import asia.rxted.blog.modules.user.service.UserServer;

@Service
public class UserServerImpl extends ServiceImpl<UserMapper, User> implements UserServer {

    @Autowired
    private ManageTokenGenerate manageTokenGenerate;

    @Override
    public ResultMessage<Token> login(String username, String password) {
        User user = this.findByUsername(username);
        if (user == null || !user.getStatus())
            return ResultUtil.error(ResultCode.USER_NOT_EXIST);
        if (!password.equals(user.getPassword()))
            return ResultUtil.error(ResultCode.USER_PASSWORD_ERROR);
        try {
            Token token = manageTokenGenerate.createToken(user, false);
            user.setAccess_token(token.getAccessToken());
            user.setRefresh_token(token.getRefreshToken());
            return ResultUtil.data(token);
        } catch (Exception e) {
            log.error("登录错误：", e);
        }
        return ResultUtil.error();

    }

    @Override
    public ResultMessage<Object> logout(String username) {
        User user = this.findByUsername(username);
        if (user == null) {
            return ResultUtil.error(ResultCode.USER_LOGOUT_ERROR);
        }
        user.setStatus(false);
        user.setAccess_token("");
        user.setRefresh_token("");
        return ResultUtil.success(ResultCode.USER_LOGOUT_SUCCESS);
    }

    @Override
    public ResultMessage<Object> logout(int id) {
        User user = this.getById(id);
        if (user == null) {
            return ResultUtil.error(ResultCode.USER_LOGOUT_ERROR);
        }
        user.setStatus(false);
        user.setAccess_token("");
        user.setRefresh_token("");
        return ResultUtil.success(ResultCode.USER_LOGOUT_ERROR);
    }

    @Override
    public Token refreshToken(String refreshToken) {
        return manageTokenGenerate.refreshToken(refreshToken);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ResultMessage<Object> saveUser(UserRegister register) {
        String username = register.getUsername();
        if (this.findByUsername(username) != null) {
            return ResultUtil.error(ResultCode.USER_EXIST);
        }
        User user = new User();
        BeanUtils.copyProperties(register, user);
        this.save(user);
        return ResultUtil.success();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ResultMessage<Object> resetPassword(int id, String password, String newPassword) {
        if (password == newPassword) {
            return ResultUtil.error(ResultCode.USER_SAME_PASSWORD_ERROR);
        }
        User user = this.getById(id);
        if (user == null) {
            return ResultUtil.error(ResultCode.USER_NOT_EXIST);
        }
        user.setPassword(newPassword);
        return ResultUtil.error(ResultCode.USER_EDIT_SUCCESS);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ResultMessage<Object> resetPassword(String username, String password, String newPassword) {
        if (password == newPassword) {
            return ResultUtil.error(ResultCode.USER_SAME_PASSWORD_ERROR);
        }
        User user = findByUsername(username);
        if (user == null) {
            return ResultUtil.error(ResultCode.USER_NOT_EXIST);
        }
        user.setPassword(newPassword);
        return ResultUtil.error(ResultCode.USER_EDIT_SUCCESS);
    }

    @Override
    public ResultMessage<Object> updateUser(User updater) {
        if (this.getById(updater.getId()) == null) {
            return ResultUtil.error(ResultCode.USER_EXIST);
        }
        User user = new User();
        BeanUtils.copyProperties(updater, user);
        try {
            this.updateById(user);
            return ResultUtil.success();
        } catch (Exception e) {
            return ResultUtil.error(ResultCode.USER_EDIT_ERROR);
        }

    }

    @Override
    public User findByUsername(String username) {
        return getOne(new LambdaQueryWrapper<User>().eq(User::getUsername, username), false);
    }

    @Override
    public IPage<User> getUserPage(Page page, QueryWrapper<User> wrapper) {
        Page<User> user = page(page, wrapper);
        System.out.println(user);
        return user;
    }

    @Override
    public ResultMessage<Object> exit(String username) {
        User user = this.findByUsername(username);
        if (user == null) {
            return ResultUtil.error(ResultCode.USER_NOT_EXIST);
        }
        user.setAccess_token("");
        user.setRefresh_token("");
        return ResultUtil.success(ResultCode.USER_EXIT_SUCCESS);
    }

    /**
     * 待开发
     */
    @Override
    public ResultMessage<Object> forgetPassword(String phone) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getPhone, phone);
        User user = this.getOne(wrapper);
        if (user == null) {
            return ResultUtil.error(ResultCode.USER_PHONE_NOT_EXIST);
        }
        System.out.println("忘记密码，暂时不开发");
        return ResultUtil.error(ResultCode.USER_OPERATION_ERROR);
    }
}
