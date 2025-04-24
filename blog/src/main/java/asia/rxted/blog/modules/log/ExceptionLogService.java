package asia.rxted.blog.modules.log;

import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.model.dto.ExceptionLogDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.entity.ExceptionLog;
import asia.rxted.blog.model.vo.ConditionVO;

public interface ExceptionLogService extends IService<ExceptionLog> {
    PageResultDTO<ExceptionLogDTO> listExceptionLogs(ConditionVO conditionVO);

}
