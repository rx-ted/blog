package asia.rxted.blog.modules.navMenu.serviceImpl;

import asia.rxted.blog.mapper.NavMenuMapper;
import asia.rxted.blog.modules.navMenu.dto.NavMenu;
import asia.rxted.blog.modules.navMenu.service.NavMenuServer;

import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

@Service
public class NavMenuServerImpl extends ServiceImpl<NavMenuMapper, NavMenu> implements NavMenuServer {

    // @Autowired
    // private NavMenuMapper navMenuMapper;

}
