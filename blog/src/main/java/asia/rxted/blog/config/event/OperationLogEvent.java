package asia.rxted.blog.config.event;

import org.springframework.context.ApplicationEvent;

import asia.rxted.blog.config.log.OperationLog;

public class OperationLogEvent extends ApplicationEvent {

    public OperationLogEvent(OperationLog operationLog) {
        super(operationLog);
    }
}
