package asia.rxted.blog.bean;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import asia.rxted.blog.handler.JwtAuthenticationTokenFilter;
import asia.rxted.blog.handler.UserAccessDeniedHandler;
import asia.rxted.blog.handler.UserAuthenticationEntryPoint;
import asia.rxted.blog.handler.UserAuthorizationManager;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class WebSecurityConfig {

        @Autowired
        private JwtAuthenticationTokenFilter jwtAuthenticationTokenFilter;

        @Autowired
        private UserAuthenticationEntryPoint userAuthenticationEntryPoint;

        @Autowired
        private UserAccessDeniedHandler userAccessDeniedHandler;

        @Autowired
        private UserAuthorizationManager userAuthorizationManager;

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

                /*
                 * NOTICE: Enable this section when the tester accesses the URL.
                 */
                http.csrf(AbstractHttpConfigurer::disable); // 禁用跨站请求伪造防护
                http.authorizeHttpRequests(requests -> requests
                                .anyRequest().access(userAuthorizationManager)
                                /* 获取白名单（不进行权限验证 */
                                // .requestMatchers("/",
                                // "/css/**", "/js/**", "/img/**", "/fonts/**", "/favicon.ico",
                                // "/index.html")
                                // .permitAll()
                                // .requestMatchers("/user/**").permitAll()
                                /* 其他的需要登陆后才能访问 */
                                // .anyRequest().authenticated()
                                );
                http.sessionManagement(session -> session
                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)); // 禁用session（使用Token认证）
                http.exceptionHandling(e -> e
                                /* 用户未登录 */
                                .authenticationEntryPoint(userAuthenticationEntryPoint)
                                /* 权限问题 */
                                .accessDeniedHandler(userAccessDeniedHandler));
                // http.authenticationProvider(userAuthenticationProvider);
                /* 测试用的 */
                /*
                 *
                 * http.formLogin(fromLogin -> fromLogin
                 * // .loginPage("/login") // 指定登录路径
                 * .loginProcessingUrl("/login/submit") // 登录路径提交表单
                 * .successHandler(userLoginSuccessHandler)// 配置登录成功处理类
                 * .failureHandler(userLoginFailureHandler)); // 配置登录失败处理类
                 */

                /* 测试用的 */
                /*
                 * http.logout(logout -> logout
                 * .logoutUrl("/logout/submit") // 配置登出地址
                 * .logoutSuccessHandler(userLogoutSuccessHandler) // 配置用户登出处理类
                 * );
                 */
                http.addFilterBefore(jwtAuthenticationTokenFilter, UsernamePasswordAuthenticationFilter.class); // 添加JWT过滤器
                return http.build();
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        /*
         * 
         * @Bean
         * public AuthenticationProvider authenticationProvider() {
         * 
         * DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
         * authProvider.setUserDetailsService(userDetailService);
         * authProvider.setPasswordEncoder(passwordEncoder());
         * return authProvider;
         * }
         */
        // @Bean
        // public AuthenticationManager
        // authenticationManager(AuthenticationConfiguration config)
        // throws Exception {
        // return config.getAuthenticationManager();
        // }

}
