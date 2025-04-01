package asia.rxted.blog.config;

import java.io.Serializable;

import lombok.Data;

@Data
public class ResultMessage<T> implements Serializable {
    private static final long serialVersionUID = 1;

    private boolean flag;
    private String msg;
    private Integer code;
    private long timestamp = System.currentTimeMillis();
    private T data;

}
