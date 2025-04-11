package asia.rxted.blog.bean;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDecisionManager;

import org.springframework.security.config.annotation.ObjectPostProcessor;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.expression.DefaultWebSecurityExpressionHandler;
import org.springframework.security.web.access.intercept.FilterInvocationSecurityMetadataSource;
import org.springframework.security.web.access.intercept.FilterSecurityInterceptor;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import asia.rxted.blog.handler.AccessDecisionManagerImpl;
import asia.rxted.blog.handler.AccessDeniedHandlerImpl;
import asia.rxted.blog.handler.AuthenticationEntryPointImpl;
import asia.rxted.blog.handler.AuthenticationFailureHandlerImpl;
import asia.rxted.blog.handler.AuthenticationProviderImpl;
import asia.rxted.blog.handler.AuthenticationSuccessHandlerImpl;
import asia.rxted.blog.handler.FilterInvocationSecurityMetadataSourceImpl;
import asia.rxted.blog.handler.JwtAuthenticationTokenFilter;
import asia.rxted.blog.handler.LogoutSuccessHandlerImpl;
import asia.rxted.blog.handler.PermissionEvaluatorImpl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class WebSecurityConfig {

        /**
         * 用户未登录处理类
         */

        @Autowired
        private AuthenticationEntryPointImpl authenticationEntryPoint;

        /**
         * 无权限处理类
         */
        @Autowired
        private AccessDeniedHandlerImpl accessDeniedHandler;

        /**
         * 用户登录成功处理类
         */
        @Autowired
        private AuthenticationSuccessHandlerImpl authenticationSuccessHandler;

        /**
         * 用户登录失败处理类
         */
        @Autowired
        private AuthenticationFailureHandlerImpl authenticationFailureHandler;

        @Autowired
        private JwtAuthenticationTokenFilter jwtAuthenticationTokenFilter;

        /**
         * 用户登出成功处理类
         */
        @Autowired
        private LogoutSuccessHandlerImpl logoutSuccessHandler;

        /**
         * 用户登录验证
         */
        @Autowired
        private AuthenticationProviderImpl authenticationProvider;

        /**
         * 用户权限注解
         */
        @Autowired
        private PermissionEvaluatorImpl permissionEvaluator;

        /**
         * 加密方式
         * 
         * @return
         */
        @Bean
        public BCryptPasswordEncoder bCryptPasswordEncoder() {
                return new BCryptPasswordEncoder();
        }

        @Bean
        public FilterInvocationSecurityMetadataSource securityMetadataSource() {
                return new FilterInvocationSecurityMetadataSourceImpl();
        }

        @Bean
        public AccessDecisionManager accessDecisionManager() {
                return new AccessDecisionManagerImpl();
        }

        /**
         * 注入自定义PermissionEvaluator
         * 
         * @return
         */
        @Bean
        public DefaultWebSecurityExpressionHandler userSecurityExpressionHandler() {
                DefaultWebSecurityExpressionHandler handler = new DefaultWebSecurityExpressionHandler();
                handler.setPermissionEvaluator(permissionEvaluator);
                return handler;
        }

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

                /*
                 * NOTICE: Enable this section when the tester accesses the URL.
                 */
                // http.csrf(csrf -> csrf.disable());
                // http.authorizeHttpRequests(requests -> requests.anyRequest().permitAll())
                // .logout(logout -> logout.permitAll());

                http.formLogin(login -> login.loginProcessingUrl("/user/login")
                                .successHandler(authenticationSuccessHandler)
                                .failureHandler(authenticationFailureHandler));

                http.authorizeHttpRequests(auth -> auth
                                .requestMatchers("/user/login").permitAll()
                                .withObjectPostProcessor(new ObjectPostProcessor<FilterSecurityInterceptor>() {
                                        @Override
                                        public <O extends FilterSecurityInterceptor> O postProcess(O fsi) {
                                                fsi.setSecurityMetadataSource(securityMetadataSource());
                                                fsi.setAccessDecisionManager(accessDecisionManager());
                                                return fsi;
                                        }
                                }).anyRequest().permitAll());
                http.csrf(csrf -> csrf.disable());
                http.exceptionHandling(handler -> handler
                                .authenticationEntryPoint(authenticationEntryPoint)
                                .accessDeniedHandler(accessDeniedHandler));
                http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

                // http.logout(logout -> logout.permitAll());

                http.addFilterBefore(jwtAuthenticationTokenFilter, UsernamePasswordAuthenticationFilter.class);
                return http.build();
        }

}
