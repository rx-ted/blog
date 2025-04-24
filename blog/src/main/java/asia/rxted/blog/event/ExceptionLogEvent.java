package asia.rxted.blog.event;

import org.springframework.context.ApplicationEvent;

import asia.rxted.blog.model.entity.ExceptionLog;


public class ExceptionLogEvent extends ApplicationEvent {
    public ExceptionLogEvent(ExceptionLog exceptionLog) {
        super(exceptionLog);
    }
}
