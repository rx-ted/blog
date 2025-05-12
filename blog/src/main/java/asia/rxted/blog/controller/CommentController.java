package asia.rxted.blog.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import asia.rxted.blog.annotation.AccessLimit;
import asia.rxted.blog.annotation.OptLog;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.constant.OptTypeConstant;
import asia.rxted.blog.model.dto.CommentAdminDTO;
import asia.rxted.blog.model.dto.CommentDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.ReplyDTO;
import asia.rxted.blog.model.vo.CommentVO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.ReviewVO;
import asia.rxted.blog.modules.comment.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@Tag(name = "评论模块")
public class CommentController {

    @Autowired
    private CommentService commentService;

    @AccessLimit(seconds = 60, maxCount = 3)
    @OptLog(optType = OptTypeConstant.SAVE)
    @Operation(summary = "添加评论")
    @PostMapping("/comments/save")
    public ResultMessage<?> saveComment(@Valid @RequestBody CommentVO commentVO) {
        commentService.saveComment(commentVO);
        return ResultVO.success();
    }

    @Operation(summary = "获取评论")
    @GetMapping("/comments")
    public ResultMessage<PageResultDTO<CommentDTO>> getComments(CommentVO commentVO) {
        return ResultVO.data(commentService.listComments(commentVO));
    }

    @Operation(summary = "根据commentId获取回复")
    @GetMapping("/comments/{commentId}/replies")
    public ResultMessage<List<ReplyDTO>> listRepliesByCommentId(@PathVariable("commentId") Integer commentId) {
        return ResultVO.data(commentService.listRepliesByCommentId(commentId));
    }

    @Operation(summary = "获取前六个评论")
    @GetMapping("/comments/topSix")
    public ResultMessage<List<CommentDTO>> listTopSixComments() {
        return ResultVO.data(commentService.listTopSixComments());
    }

    @Operation(summary = "查询后台评论")
    @GetMapping("/admin/comments")
    public ResultMessage<PageResultDTO<CommentAdminDTO>> listCommentBackDTO(ConditionVO conditionVO) {
        return ResultVO.data(commentService.listCommentsAdmin(conditionVO));
    }

    @OptLog(optType = OptTypeConstant.UPDATE)
    @Operation(summary = "审核评论")
    @PutMapping("/admin/comments/review")
    public ResultMessage<?> updateCommentsReview(@Valid @RequestBody ReviewVO reviewVO) {
        commentService.updateCommentsReview(reviewVO);
        return ResultVO.success();
    }

    @OptLog(optType = OptTypeConstant.DELETE)
    @Operation(summary = "删除评论")
    @DeleteMapping("/admin/comments")
    public ResultMessage<?> deleteComments(@RequestBody List<Integer> commentIdList) {
        commentService.removeByIds(commentIdList);
        return ResultVO.success();
    }

}
