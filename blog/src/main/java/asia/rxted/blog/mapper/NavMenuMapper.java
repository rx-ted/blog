package asia.rxted.blog.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import asia.rxted.blog.modules.navMenu.dto.NavMenu;

@Mapper
public interface NavMenuMapper extends BaseMapper<NavMenu> {

}
