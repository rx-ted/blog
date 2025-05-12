package asia.rxted.blog.modules.website.impl;

import java.util.Date;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.mapper.UniqueViewMapper;
import asia.rxted.blog.model.dto.UniqueViewDTO;
import asia.rxted.blog.model.entity.UniqueView;
import asia.rxted.blog.modules.website.UniqueViewService;
import cn.hutool.core.date.DateTime;
import cn.hutool.core.date.DateUtil;

@Service
public class UniqueViewServiceImpl extends ServiceImpl<UniqueViewMapper, UniqueView> implements UniqueViewService {
    @Autowired
    private UniqueViewMapper uniqueViewMapper;

    @Override
    public List<UniqueViewDTO> listUniqueViews() {
        DateTime startTime = DateUtil.beginOfDay(DateUtil.offsetDay(new Date(), -7));
        DateTime endTime = DateUtil.endOfDay(new Date());
        return uniqueViewMapper.listUniqueViews(startTime, endTime);
    }
}
