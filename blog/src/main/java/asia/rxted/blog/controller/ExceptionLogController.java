package asia.rxted.blog.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import asia.rxted.blog.annotation.OptLog;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.constant.OptTypeConstant;
import asia.rxted.blog.model.dto.ExceptionLogDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.modules.log.ExceptionLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;

@Tag(name = "异常日志模块")
@RestController
public class ExceptionLogController {

    @Autowired
    private ExceptionLogService exceptionLogService;

    @Operation(summary = "获取异常日志")
    @GetMapping("/admin/exception/logs")
    public ResultMessage<PageResultDTO<ExceptionLogDTO>> listExceptionLogs(ConditionVO conditionVO) {
        return ResultVO.data(exceptionLogService.listExceptionLogs(conditionVO));
    }

    @OptLog(optType = OptTypeConstant.DELETE)
    @Operation(summary = "删除异常日志")
    @DeleteMapping("/admin/exception/logs")
    public ResultMessage<?> deleteExceptionLogs(@RequestBody List<Integer> exceptionLogIds) {
        exceptionLogService.removeByIds(exceptionLogIds);
        return ResultVO.success();
    }

}
