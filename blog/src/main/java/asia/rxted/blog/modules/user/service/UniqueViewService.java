package asia.rxted.blog.modules.user.service;

import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.model.dto.UniqueViewDTO;
import asia.rxted.blog.model.entity.UniqueView;

import java.util.List;

public interface UniqueViewService extends IService<UniqueView> {

    List<UniqueViewDTO> listUniqueViews();

}
