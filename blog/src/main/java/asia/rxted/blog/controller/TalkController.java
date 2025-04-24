package asia.rxted.blog.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import asia.rxted.blog.annotation.OptLog;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.constant.OptTypeConstant;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.TalkAdminDTO;
import asia.rxted.blog.model.dto.TalkDTO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.TalkVO;
import asia.rxted.blog.modules.talk.TalkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;

import javax.validation.Valid;
import java.util.List;

@Tag(name = "说说模块")
@RestController
public class TalkController {

    @Autowired
    private TalkService talkService;

    // @Autowired
    // private UploadStrategyContext uploadStrategyContext;

    @Operation(summary = "查看说说列表")
    @GetMapping("/talks")
    public ResultMessage<PageResultDTO<TalkDTO>> listTalks() {
        return ResultVO.data(talkService.listTalks());
    }

    @Operation(summary = "根据id查看说说")
    @Parameter(name = "talkId", description = "说说id", required = true, schema = @Schema(type = "Integer"))
    @GetMapping("/talks/{talkId}")
    public ResultMessage<TalkDTO> getTalkById(@PathVariable("talkId") Integer talkId) {
        return ResultVO.data(talkService.getTalkById(talkId));
    }

    @OptLog(optType = OptTypeConstant.UPLOAD)
    @Operation(summary = "上传说说图片")
    @Parameter(name = "file", description = "说说图片", required = true, schema = @Schema(type = "String", format = "binary"))
    @PostMapping("/admin/talks/images")
    public ResultMessage<String> saveTalkImages(MultipartFile file) {
        // return ResultVO.ok(uploadStrategyContext.executeUploadStrategy(file,
        // FilePathEnum.TALK.getPath()));
        return null;
    }

    @OptLog(optType = OptTypeConstant.SAVE_OR_UPDATE)
    @Operation(summary = "保存或修改说说")
    @PostMapping("/admin/talks")
    public ResultMessage<?> saveOrUpdateTalk(@Valid @RequestBody TalkVO talkVO) {
        talkService.saveOrUpdateTalk(talkVO);
        return ResultVO.success();
    }

    @OptLog(optType = OptTypeConstant.DELETE)
    @Operation(summary = "删除说说")
    @DeleteMapping("/admin/talks")
    public ResultMessage<?> deleteTalks(@RequestBody List<Integer> talkIds) {
        talkService.deleteTalks(talkIds);
        return ResultVO.success();
    }

    @Operation(summary = "查看后台说说")
    @GetMapping("/admin/talks")
    public ResultMessage<PageResultDTO<TalkAdminDTO>> listBackTalks(ConditionVO conditionVO) {
        return ResultVO.data(talkService.listBackTalks(conditionVO));
    }

    @Operation(summary = "根据id查看后台说说")
    @Parameter(name = "talkId", description = "说说id", required = true, schema = @Schema(type = "Integer"))
    @GetMapping("/admin/talks/{talkId}")
    public ResultMessage<TalkAdminDTO> getBackTalkById(@PathVariable("talkId") Integer talkId) {
        return ResultVO.data(talkService.getBackTalkById(talkId));
    }

}
