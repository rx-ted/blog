package asia.rxted.blog.modules.log;


import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.model.dto.OperationLogDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.entity.OperationLog;
import asia.rxted.blog.model.vo.ConditionVO;

public interface OperationLogService extends IService<OperationLog> {

    PageResultDTO<OperationLogDTO> listOperationLogs(ConditionVO conditionVO);

}
