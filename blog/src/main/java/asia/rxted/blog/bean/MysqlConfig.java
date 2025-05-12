package asia.rxted.blog.bean;

import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.jdbc.core.JdbcTemplate;

@Component
public class MysqlConfig implements ApplicationListener {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void onApplicationEvent(ApplicationEvent event) {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            System.out.println("Successfully connected to MySQL database!");
        } catch (Exception e) {
            System.err.println("Failed to connect to MySQL database: " + e.getMessage());
            throw new RuntimeException("Database connection failed");
        }
    }

}
