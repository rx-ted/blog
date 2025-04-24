package asia.rxted.blog.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import asia.rxted.blog.annotation.OptLog;
import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.config.ResultVO;
import asia.rxted.blog.constant.OptTypeConstant;
import asia.rxted.blog.model.dto.PageResultDTO;
import asia.rxted.blog.model.dto.TagAdminDTO;
import asia.rxted.blog.model.dto.TagDTO;
import asia.rxted.blog.model.vo.ConditionVO;
import asia.rxted.blog.model.vo.TagVO;
import asia.rxted.blog.modules.article.service.TagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import javax.validation.Valid;
import java.util.List;

@Tag(name = "标签模块")
@RestController
public class TagController {

    @Autowired
    private TagService tagService;

    @Operation(summary = "获取所有标签")
    @GetMapping("/tags/all")
    public ResultMessage<List<TagDTO>> getAllTags() {
        return ResultVO.data(tagService.listTags());
    }

    @Operation(summary = "获取前十个标签")
    @GetMapping("/tags/topTen")
    public ResultMessage<List<TagDTO>> getTopTenTags() {
        return ResultVO.data(tagService.listTopTenTags());
    }

    @Operation(summary = "查询后台标签列表")
    @GetMapping("/admin/tags")
    public ResultMessage<PageResultDTO<TagAdminDTO>> listTagsAdmin(ConditionVO conditionVO) {
        return ResultVO.data(tagService.listTagsAdmin(conditionVO));
    }

    @Operation(summary = "搜索文章标签")
    @GetMapping("/admin/tags/search")
    public ResultMessage<List<TagAdminDTO>> listTagsAdminBySearch(ConditionVO condition) {
        return ResultVO.data(tagService.listTagsAdminBySearch(condition));
    }

    @OptLog(optType = OptTypeConstant.SAVE)
    @Operation(summary = "添加标签")
    @PostMapping("/admin/tags")
    public ResultMessage<?> saveTag(@Valid @RequestBody String tagName) {
        return ResultVO.status(tagService.saveTag(tagName));
    }

    @OptLog(optType = OptTypeConstant.UPDATE)
    @Operation(summary = "修改标签")
    @PutMapping("/admin/tags")
    public ResultMessage<?> updateTag(@Valid @RequestBody TagVO tagVO) {
        return ResultVO.status(tagService.updateTag(tagVO));
    }

    @OptLog(optType = OptTypeConstant.DELETE)
    @Operation(summary = "删除标签")
    @DeleteMapping("/admin/tags")
    public ResultMessage<?> deleteTag(@RequestBody List<Integer> tagIdList) {
        return ResultVO.status(tagService.deleteTags(tagIdList));
    }
}
