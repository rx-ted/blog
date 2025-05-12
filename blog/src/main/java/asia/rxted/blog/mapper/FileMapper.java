package asia.rxted.blog.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import asia.rxted.blog.model.entity.File;

@Mapper
public interface FileMapper extends BaseMapper<File> {

}
