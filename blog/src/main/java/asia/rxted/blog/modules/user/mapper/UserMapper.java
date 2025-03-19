package asia.rxted.blog.modules.user.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import asia.rxted.blog.modules.user.dto.User;

@Mapper
public interface UserMapper extends BaseMapper<User> {
    // User findByUsername(String username);

}
