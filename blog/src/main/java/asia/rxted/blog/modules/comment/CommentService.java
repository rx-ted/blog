package asia.rxted.blog.modules.comment;

import java.util.List;

import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.model.dto.CommentAdminDTO;
import asia.rxted.blog.model.dto.CommentDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.ReplyDTO;
import asia.rxted.blog.model.entity.Comment;
import asia.rxted.blog.model.vo.CommentVO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.ReviewVO;

public interface CommentService extends IService<Comment> {

    void saveComment(CommentVO commentVO);

    PageResultDTO<CommentDTO> listComments(CommentVO commentVO);

    List<ReplyDTO> listRepliesByCommentId(Integer commentId);

    List<CommentDTO> listTopSixComments();

    PageResultDTO<CommentAdminDTO> listCommentsAdmin(ConditionVO conditionVO);

    void updateCommentsReview(ReviewVO reviewVO);

}
