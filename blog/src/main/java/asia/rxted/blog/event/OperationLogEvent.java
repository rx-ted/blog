package asia.rxted.blog.event;

import org.springframework.context.ApplicationEvent;

import asia.rxted.blog.log.OperationLog;

public class OperationLogEvent extends ApplicationEvent {

    public OperationLogEvent(OperationLog operationLog) {
        super(operationLog);
    }
}
