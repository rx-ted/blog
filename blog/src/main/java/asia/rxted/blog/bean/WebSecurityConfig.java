package asia.rxted.blog.bean;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDecisionManager;
import org.springframework.security.config.annotation.ObjectPostProcessor;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.access.intercept.FilterInvocationSecurityMetadataSource;
import org.springframework.security.web.access.intercept.FilterSecurityInterceptor;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import asia.rxted.blog.handler.AccessDecisionManagerImpl;
import asia.rxted.blog.handler.FilterInvocationSecurityMetadataSourceImpl;
import asia.rxted.blog.handler.JwtAuthenticationTokenFilter;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;

@Configuration
@EnableWebSecurity

public class WebSecurityConfig {
        @Autowired
        private AuthenticationEntryPoint authenticationEntryPoint;

        @Autowired
        private AccessDeniedHandler accessDeniedHandler;

        @Autowired
        private AuthenticationSuccessHandler authenticationSuccessHandler;

        @Autowired
        private AuthenticationFailureHandler authenticationFailureHandler;

        @Autowired
        private JwtAuthenticationTokenFilter jwtAuthenticationTokenFilter;

        @Bean
        public FilterInvocationSecurityMetadataSource securityMetadataSource() {
                return new FilterInvocationSecurityMetadataSourceImpl();
        }

        @Bean
        public AccessDecisionManager accessDecisionManager() {
                return new AccessDecisionManagerImpl();
        }

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

                /*
                 * NOTICE: Enable this section when the tester accesses the URL.
                 */
                // http.csrf(csrf -> csrf.disable());
                // http.authorizeHttpRequests(requests -> requests.anyRequest().permitAll())
                // .logout(logout -> logout.permitAll());

                http.logout(logout -> logout.permitAll());
                http.csrf(csrf -> csrf.disable());
                http.authorizeHttpRequests(auth -> auth
                                .withObjectPostProcessor(new ObjectPostProcessor<FilterSecurityInterceptor>() {
                                        @Override
                                        public <O extends FilterSecurityInterceptor> O postProcess(O fsi) {
                                                fsi.setSecurityMetadataSource(securityMetadataSource());
                                                fsi.setAccessDecisionManager(accessDecisionManager());
                                                return fsi;
                                        }
                                }).anyRequest().permitAll());

                http.exceptionHandling(handler -> handler
                                .authenticationEntryPoint(authenticationEntryPoint)
                                .accessDeniedHandler(accessDeniedHandler)
                                );
                http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
                http.formLogin(login -> login.loginProcessingUrl("/user/login")
                                .successHandler(authenticationSuccessHandler)
                                .failureHandler(authenticationFailureHandler));
                http.addFilterBefore(jwtAuthenticationTokenFilter, UsernamePasswordAuthenticationFilter.class);
                return http.build();
        }

}
