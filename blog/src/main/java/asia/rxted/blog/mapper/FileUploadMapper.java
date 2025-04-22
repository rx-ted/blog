package asia.rxted.blog.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import asia.rxted.blog.model.entity.FileUpload;

@Mapper
public interface FileUploadMapper extends BaseMapper<FileUpload> {

}
