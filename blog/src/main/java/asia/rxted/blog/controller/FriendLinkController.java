package asia.rxted.blog.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import asia.rxted.blog.annotation.OptLog;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.constant.OptTypeConstant;
import asia.rxted.blog.model.dto.FriendLinkAdminDTO;
import asia.rxted.blog.model.dto.FriendLinkDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.FriendLinkVO;
import asia.rxted.blog.modules.friendLink.FriendLinkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import javax.validation.Valid;
import java.util.List;

@Tag(name = "友链模块")
@RestController
public class FriendLinkController {

    @Autowired
    private FriendLinkService friendLinkService;

    @Operation(summary = "查看友链列表")
    @GetMapping("/links")
    public ResultMessage<List<FriendLinkDTO>> listFriendLinks() {
        return ResultVO.data(friendLinkService.listFriendLinks());
    }

    @Operation(summary = "查看后台友链列表")
    @GetMapping("/admin/links")
    public ResultMessage<PageResultDTO<FriendLinkAdminDTO>> listFriendLinkDTO(ConditionVO conditionVO) {
        return ResultVO.data(friendLinkService.listFriendLinksAdmin(conditionVO));
    }

    @OptLog(optType = OptTypeConstant.SAVE_OR_UPDATE)
    @Operation(summary = "保存或修改友链")
    @PostMapping("/admin/links")
    public ResultMessage<?> saveOrUpdateFriendLink(@Valid @RequestBody FriendLinkVO friendLinkVO) {
        friendLinkService.saveOrUpdateFriendLink(friendLinkVO);
        return ResultVO.success();
    }

    @OptLog(optType = OptTypeConstant.DELETE)
    @Operation(summary = "删除友链")
    @DeleteMapping("/admin/links")
    public ResultMessage<?> deleteFriendLink(@RequestBody List<Integer> linkIdList) {
        friendLinkService.removeByIds(linkIdList);
        return ResultVO.success();
    }
}
