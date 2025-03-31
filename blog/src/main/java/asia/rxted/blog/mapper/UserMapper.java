package asia.rxted.blog.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import asia.rxted.blog.model.dto.UserAuthDTO;

@Mapper
public interface UserMapper extends BaseMapper<UserAuthDTO> {
    // User findByUsername(String username);

}
