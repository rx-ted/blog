package asia.rxted.blog.modules.user.serviceImpl;

import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.modules.user.dto.User;
import asia.rxted.blog.modules.user.mapper.UserMapper;
import asia.rxted.blog.modules.user.service.UserServer;

@Service
public class UserServerImpl extends ServiceImpl<UserMapper, User> implements UserServer {

}
