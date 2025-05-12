package asia.rxted.blog.controller;

import asia.rxted.blog.annotation.OptLog;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.constant.OptTypeConstant;
import asia.rxted.blog.model.dto.OperationLogDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.modules.log.OperationLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "操作日志模块")
@RestController
public class OperationLogController {

    @Autowired
    private OperationLogService operationLogService;

    @Operation(summary = "查看操作日志")
    @GetMapping("/admin/operation/logs")
    public ResultMessage<PageResultDTO<OperationLogDTO>> listOperationLogs(ConditionVO conditionVO) {
        return ResultVO.data(operationLogService.listOperationLogs(conditionVO));
    }

    @OptLog(optType = OptTypeConstant.DELETE)
    @Operation(summary = "删除操作日志")
    @DeleteMapping("/admin/operation/logs")
    public ResultMessage<?> deleteOperationLogs(@RequestBody List<Integer> operationLogIds) {
        operationLogService.removeByIds(operationLogIds);
        return ResultVO.success();
    }

}
