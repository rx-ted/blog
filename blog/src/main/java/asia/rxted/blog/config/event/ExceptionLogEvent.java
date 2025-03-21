package asia.rxted.blog.config.event;

import org.springframework.context.ApplicationEvent;

import asia.rxted.blog.config.log.ExceptionLog;

public class ExceptionLogEvent extends ApplicationEvent {
    public ExceptionLogEvent(ExceptionLog exceptionLog) {
        super(exceptionLog);
    }
}
