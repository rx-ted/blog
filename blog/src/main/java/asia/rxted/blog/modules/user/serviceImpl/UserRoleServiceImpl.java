package asia.rxted.blog.modules.user.serviceImpl;

import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.mapper.UserRoleMapper;
import asia.rxted.blog.model.entity.UserRole;
import asia.rxted.blog.modules.user.service.UserRoleService;

@Service
public class UserRoleServiceImpl extends ServiceImpl<UserRoleMapper, UserRole> implements UserRoleService {

}
