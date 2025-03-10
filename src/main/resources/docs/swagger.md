## Swagger2注解 Swagger3注解 注解位置

|swagger|springfox|description|
|:-:|:-:|:-:|
|@Api| @Tag|(name = “接口类描述”) Controller类上|
|@ApiOperation| @Operation|(summary = “接口方法描述”) Controller方法上|
|@ApiImplicitParams| @Parameters| Controller方法上|
|@ApiImplicitParam| @Parameter|(description = “参数描述”) Controller方法上|
|@ApiParam| @Parameter|(description = “参数描述”) 方法参数上|
|@ApiIgnore| @Parameter|(hidden = true) 或 @Operation(hidden = true) -|
|@ApiModel| @Schema| DTO类上|
|@ApiModelProperty| @Schema| DTO属性上|
