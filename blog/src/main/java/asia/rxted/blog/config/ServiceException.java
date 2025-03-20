package asia.rxted.blog.config;

import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class ServiceException extends RuntimeException {
    public static final String DEFAULT_MESSAGE = "网络错误，请稍后重试！";

    private String msg = DEFAULT_MESSAGE;
    private ResultCode resultCode;

    public ServiceException(String msg) {
        this.resultCode = ResultCode.ERROR;
        this.msg = msg;
    }

    public ServiceException(ResultCode resultCode, String msg) {
        this.resultCode = resultCode;
        this.msg = msg;
    }

    public ServiceException(ResultCode resultCode) {
        this.resultCode = resultCode;
    }

    public ServiceException() {
        super();
    }

}
