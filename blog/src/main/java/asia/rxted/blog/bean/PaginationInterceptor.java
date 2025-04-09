package asia.rxted.blog.bean;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import asia.rxted.blog.constant.CommonConstant;
import asia.rxted.blog.utils.PageUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Objects;
import java.util.Optional;

@Component
@SuppressWarnings("all")
public class PaginationInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String currentPage = request.getParameter(CommonConstant.CURRENT);
        String pageSize = Optional.ofNullable(request.getParameter(CommonConstant.SIZE))
                .orElse(CommonConstant.DEFAULT_SIZE);
        if (!Objects.isNull(currentPage) && !StringUtils.isEmpty(currentPage)) {
            PageUtil.setCurrentPage(new Page<>(Long.parseLong(currentPage), Long.parseLong(pageSize)));
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler,
            Exception ex) {
        PageUtil.remove();
    }

}