package asia.rxted.blog.modules.friendLink.impl;

import java.util.List;

import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import asia.rxted.blog.mapper.FriendLinkMapper;
import asia.rxted.blog.model.dto.FriendLinkAdminDTO;
import asia.rxted.blog.model.dto.FriendLinkDTO;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.entity.FriendLink;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.FriendLinkVO;
import asia.rxted.blog.modules.friendLink.FriendLinkService;
import asia.rxted.blog.utils.BeanCopyUtil;
import asia.rxted.blog.utils.PageUtil;

@Service
public class FriendLinkServiceImpl extends ServiceImpl<FriendLinkMapper, FriendLink> implements FriendLinkService {
    @Autowired
    private FriendLinkMapper friendLinkMapper;

    @Override
    public List<FriendLinkDTO> listFriendLinks() {
        List<FriendLink> friendLinks = friendLinkMapper.selectList(null);
        return BeanCopyUtil.copyList(friendLinks, FriendLinkDTO.class);
    }

    @Override
    public PageResultDTO<FriendLinkAdminDTO> listFriendLinksAdmin(ConditionVO conditionVO) {
        Page<FriendLink> page = new Page<>(PageUtil.getCurrent(), PageUtil.getSize());
        Page<FriendLink> friendLinkPage = friendLinkMapper.selectPage(page, new LambdaQueryWrapper<FriendLink>()
                .like(StringUtils.isNotBlank(conditionVO.getKeywords()), FriendLink::getLinkName,
                        conditionVO.getKeywords()));
        List<FriendLinkAdminDTO> friendLinkBackDTOs = BeanCopyUtil.copyList(friendLinkPage.getRecords(),
                FriendLinkAdminDTO.class);
        return new PageResultDTO<>(friendLinkBackDTOs, friendLinkPage.getTotal());
    }

    @Override
    public void saveOrUpdateFriendLink(FriendLinkVO friendLinkVO) {
        FriendLink friendLink = BeanCopyUtil.copyObject(friendLinkVO, FriendLink.class);
        this.saveOrUpdate(friendLink);
    }

}
