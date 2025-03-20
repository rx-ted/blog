package asia.rxted.blog.modules.user.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import asia.rxted.blog.modules.user.entity.UserInfo;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserInfoMapper extends BaseMapper<UserInfo> {

}
