package asia.rxted.blog.modules.website;

import java.util.List;

import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.model.dto.UniqueViewDTO;
import asia.rxted.blog.model.entity.UniqueView;

public interface UniqueViewService extends IService<UniqueView> {
    List<UniqueViewDTO> listUniqueViews();

}
