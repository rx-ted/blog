package asia.rxted.blog.modules.friendLink;

import java.util.List;

import com.baomidou.mybatisplus.extension.service.IService;

import asia.rxted.blog.model.dto.FriendLinkAdminDTO;
import asia.rxted.blog.model.dto.FriendLinkDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.entity.FriendLink;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.FriendLinkVO;

public interface FriendLinkService extends IService<FriendLink> {
    List<FriendLinkDTO> listFriendLinks();

    PageResultDTO<FriendLinkAdminDTO> listFriendLinksAdmin(ConditionVO conditionVO);

    void saveOrUpdateFriendLink(FriendLinkVO friendLinkVO);
}
