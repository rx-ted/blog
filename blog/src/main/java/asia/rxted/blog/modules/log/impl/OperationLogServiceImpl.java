package asia.rxted.blog.modules.log.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.mapper.OperationLogMapper;
import asia.rxted.blog.model.dto.OperationLogDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.entity.OperationLog;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.modules.log.OperationLogService;
import asia.rxted.blog.utils.BeanCopyUtil;
import asia.rxted.blog.utils.PageUtil;

import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OperationLogServiceImpl extends ServiceImpl<OperationLogMapper, OperationLog>
        implements OperationLogService {

    @Override
    public PageResultDTO<OperationLogDTO> listOperationLogs(ConditionVO conditionVO) {
        Page<OperationLog> page = new Page<>(PageUtil.getCurrent(), PageUtil.getSize());
        Page<OperationLog> operationLogPage = this.page(page, new LambdaQueryWrapper<OperationLog>()
                .like(StringUtils.isNotBlank(conditionVO.getKeywords()), OperationLog::getOptModule,
                        conditionVO.getKeywords())
                .or()
                .like(StringUtils.isNotBlank(conditionVO.getKeywords()), OperationLog::getOptDesc,
                        conditionVO.getKeywords())
                .orderByDesc(OperationLog::getId));
        List<OperationLogDTO> operationLogDTOs = BeanCopyUtil.copyList(operationLogPage.getRecords(),
                OperationLogDTO.class);
        return new PageResultDTO<>(operationLogDTOs, operationLogPage.getTotal());
    }

}
