package asia.rxted.blog.modules.email.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

import asia.rxted.blog.config.ResultMessage;
import asia.rxted.blog.modules.email.service.EmailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.web.bind.annotation.PostMapping;

@Tag(name = "邮箱管理", description = "邮箱管理API")
@RestController
@RequestMapping("/verify/email")
public class EmailController {
    @Autowired
    private EmailService email;

    @Operation(summary = "发送验证码")
    @Parameter(name = "to", description = "接收者")
    @PostMapping()
    public ResultMessage<Object> sendEmail(@RequestParam String to) {
        return email.sendEmail(to);
    }

    @Operation(summary = "验证码验证")
    @Parameters({
            @Parameter(name = "to", description = "接收者"),
            @Parameter(name = "code", description = "验证码"),
    })
    @PostMapping("verify")
    public ResultMessage<Object> verify(@RequestParam String to, @RequestParam String code) {
        return email.verifyCode(to, code);
    }

}
