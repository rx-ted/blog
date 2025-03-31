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

import asia.rxted.blog.config.ResultCode;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultUtil;
import asia.rxted.blog.mapper.UserMapper;
import asia.rxted.blog.modules.system.token.ManageTokenGenerate;
import asia.rxted.blog.modules.token.config.Token;
import asia.rxted.blog.modules.user.config.UserRegister;
import asia.rxted.blog.model.dto.UserAuthDTO;
import asia.rxted.blog.modules.user.service.UserServer;

@Service
public class UserServerImpl extends ServiceImpl<UserMapper, UserAuthDTO> implements UserServer {

    @Autowired
    private ManageTokenGenerate manageTokenGenerate;

    @Override
    public ResultMessage<Token> login(String username, String password) {
        UserAuthDTO user = this.findByUsername(username);
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
        UserAuthDTO user = this.findByUsername(username);
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
        UserAuthDTO user = this.getById(id);
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
        UserAuthDTO user = new UserAuthDTO();
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
        UserAuthDTO user = this.getById(id);
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
        UserAuthDTO user = findByUsername(username);
        if (user == null) {
            return ResultUtil.error(ResultCode.USER_NOT_EXIST);
        }
        user.setPassword(newPassword);
        return ResultUtil.error(ResultCode.USER_EDIT_SUCCESS);
    }

    @Override
    public ResultMessage<Object> updateUser(UserAuthDTO updater) {
        if (this.getById(updater.getId()) == null) {
            return ResultUtil.error(ResultCode.USER_EXIST);
        }
        UserAuthDTO user = new UserAuthDTO();
        BeanUtils.copyProperties(updater, user);
        try {
            this.updateById(user);
            return ResultUtil.success();
        } catch (Exception e) {
            return ResultUtil.error(ResultCode.USER_EDIT_ERROR);
        }

    }

    @Override
    public UserAuthDTO findByUsername(String username) {
        return getOne(new LambdaQueryWrapper<UserAuthDTO>().eq(UserAuthDTO::getUsername, username), false);
    }

    @Override
    public IPage<UserAuthDTO> getUserPage(Page page, QueryWrapper<UserAuthDTO> wrapper) {
        Page<UserAuthDTO> user = page(page, wrapper);
        System.out.println(user);
        return user;
    }

    @Override
    public ResultMessage<Object> exit(String username) {
        UserAuthDTO user = this.findByUsername(username);
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
        LambdaQueryWrapper<UserAuthDTO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserAuthDTO::getPhone, phone);
        UserAuthDTO user = this.getOne(wrapper);
        if (user == null) {
            return ResultUtil.error(ResultCode.USER_PHONE_NOT_EXIST);
        }
        System.out.println("忘记密码，暂时不开发");
        return ResultUtil.error(ResultCode.USER_OPERATION_ERROR);
    }
}
