package asia.rxted.blog.common.event;

import org.springframework.context.ApplicationEvent;

import asia.rxted.blog.config.entity.ExceptionLog;

public class ExceptionLogEvent extends ApplicationEvent {
    public ExceptionLogEvent(ExceptionLog exceptionLog) {
        super(exceptionLog);
    }
}
