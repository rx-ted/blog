package asia.rxted.blog.config;

public class ResultVO<T> {

    private final ResultMessage<T> resultMessage;

    public ResultVO() {
        resultMessage = new ResultMessage<>();
        resultMessage.setFlag(true);
        resultMessage.setCode(ResultCode.SUCCESS.code());
        resultMessage.setMsg("success");
    }

    public ResultMessage<T> setSuccessMsg(ResultCode resultCode) {
        this.resultMessage.setFlag(true);
        this.resultMessage.setMsg(resultCode.message());
        this.resultMessage.setCode(resultCode.code());
        return this.resultMessage;
    }

    public static <T> ResultMessage<T> success() {
        return new ResultVO<T>().setSuccessMsg(ResultCode.SUCCESS);
    }

    public static <T> ResultMessage<T> success(ResultCode resultCode) {
        return new ResultVO<T>().setSuccessMsg(resultCode);
    }

    public ResultMessage<T> setData(T t) {
        this.resultMessage.setData(t);
        return this.resultMessage;
    }

    public static <T> ResultMessage<T> data(T t) {
        return new ResultVO<T>().setData(t);
    }

    public ResultMessage<T> setErrorMsg(ResultCode resultCode) {
        this.resultMessage.setFlag(false);
        this.resultMessage.setCode(resultCode.code());
        this.resultMessage.setMsg(resultCode.message());
        return this.resultMessage;
    }

    public ResultMessage<T> setErrorMsg(Integer code, String msg) {
        this.resultMessage.setFlag(false);
        this.resultMessage.setCode(code);
        this.resultMessage.setMsg(msg);
        return this.resultMessage;
    }

    public static <T> ResultMessage<T> error(Integer code, String msg) {
        return new ResultVO<T>().setErrorMsg(code, msg);
    }

    public static <T> ResultMessage<T> error(ResultCode resultCode) {
        return new ResultVO<T>().setErrorMsg(resultCode);
    }

    public static <T> ResultMessage<T> error() {
        return new ResultVO<T>().setErrorMsg(ResultCode.ERROR);
    }

    public static RuntimeException fail(ResultCode code) {
        throw new ServiceException(code);
    }

}
