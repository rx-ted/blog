package asia.rxted.blog.common.event;

import org.springframework.context.ApplicationEvent;

import asia.rxted.blog.config.entity.OperationLog;

public class OperationLogEvent extends ApplicationEvent {

    public OperationLogEvent(OperationLog operationLog) {
        super(operationLog);
    }
}
