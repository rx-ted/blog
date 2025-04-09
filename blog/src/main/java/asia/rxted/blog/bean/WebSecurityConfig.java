package asia.rxted.blog.bean;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

import asia.rxted.blog.handler.AccessDecisionManagerImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true, securedEnabled = true, jsr250Enabled = true)
public class WebSecurityConfig {

        @Autowired
        private AuthenticationSuccessHandler authenticationSuccessHandler;

        @Autowired
        private AuthenticationFailureHandler authenticationFailureHandler;

        @Bean
        public AuthorizationManager<RequestAuthorizationContext> authorizationDecision() {
                return new AccessDecisionManagerImpl();
        }

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

                http
                                .authorizeHttpRequests((requests) -> requests
                                                .anyRequest()
                                                .access(authorizationDecision())

                                )

                                .formLogin((formLogin) -> formLogin
                                                .loginProcessingUrl("/user/login")
                                                .successHandler(authenticationSuccessHandler)
                                                .failureHandler(authenticationFailureHandler)
                                                .permitAll())

                                .sessionManagement((sessionManagement) -> sessionManagement
                                                .sessionConcurrency((sessionConcurrency) -> sessionConcurrency
                                                                .maximumSessions(1)
                                                                .expiredUrl("/login.html")));

                /*
                 * NOTICE: Enable this section when the tester accesses the URL.
                 */
                // http.csrf(csrf -> csrf.disable());
                // http.authorizeHttpRequests(requests ->
                // requests.anyRequest().permitAll()).logout(logout -> logout.permitAll());

                return http.build();
        }

}
