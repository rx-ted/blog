package asia.rxted.blog.config;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class BizException extends RuntimeException {

    private Integer code = ResultCode.FAIL.code();

    private final String message;

    public BizException(String message) {
        this.message = message;
    }

    public BizException(ResultCode resultCode) {
        this.code = resultCode.code();
        this.message = resultCode.message();
    }

}
