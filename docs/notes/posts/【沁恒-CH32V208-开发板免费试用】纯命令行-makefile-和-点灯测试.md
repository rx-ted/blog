---
title: 【沁恒 CH32V208 开发板免费试用】RTT 纯命令行(makefile) 和 点灯测试
date: 2023-05-24 18:24:01
tags: 嵌入式
---


# 概述

沁恒 CH32V208 开发板是一款基于risc-v内核的微控制器，具有丰富的外设资源和高性能的处理能力。本文介绍了如何使用makefile进行编译，并提供了一个简单的点灯测试程序示例，以验证开发板的基本功能是否正常。通过本文的介绍，读者可以快速上手使用沁恒 CH32V208 开发板进行开发。
![](https://file1.elecfans.com/web2/M00/82/13/wKgZomQ_i4aAaU6qAAXkgUcA_hM075.png)


# 环境/工具

需要借助一些软件和硬件相结合，做出项目.

## 软件

- Windows10 (其他平台没测试)
- VScode
- make (针对makefile编译)
- risc-v 8.2.0 工具箱 (github有提供riscv-none-embed-XXX压缩包)
- WCHISPTOOLS (沁恒自带烧录工具)
- SERIAL DEBUG （查看调试日志）
  
![](https://file1.elecfans.com/web2/M00/88/A6/wKgZomRt8tGAJiUyAABs7wpvZ70652.png) 

> 首先，让我们来了解一下如何使用makefile进行编译。makefile是一种常用的自动化构建工具，它可以根据指定的规则自动化地生成目标文件和可执行文件。在使用makefile之前，需要安装GNU Make工具，并在项目目录下创建一个名为Makefile的文件。所以不借助平台来编译，只用纯命令行来执行，所以锻炼自己能力哈。

## 硬件

- CH32V208开发板
- wch-link (快递赠的)
![](https://file1.elecfans.com/web2/M00/88/A6/wKgaomRt8meACM7xABhDe2UvI3U284.png)

![](https://file1.elecfans.com/web2/M00/88/A5/wKgaomRt8hyARM7vAAfPp8VjDXc144.png)
  
# 测试

接下来，让我们来看一下如何进行点灯测试。点灯测试是一种常用的测试方法，可以验证开发板的基本功能是否正常。在沁恒 CH32V208 开发板上，可以通过GPIO口控制LED灯的亮灭。

## 实例

用makefile来编译

```makefile

TARGET := 01LED

include config.mk
include src.mk

CFLAGS += $(CPPPATHS)
CXXFLAGS += $(CPPPATHS)
AFLAGS += $(CPPPATHS)

CFLAGS += $(DEFINES)
CXXFLAGS += $(DEFINES)
AFLAGS += $(DEFINES)



TOOLCHAIN    = riscv-none-embed-
CC           = $(TOOLCHAIN)gcc
SZ           = $(TOOLCHAIN)size
CP           = $(TOOLCHAIN)objcopy
AS           = $(TOOLCHAIN)gcc
HEX          = $(CP) -O ihex
BIN          = $(CP) -O binary -S

# IOT position
ROOT_DIR := ../../../..
# bsp position
BSP_DIR := .
BUILD_DIR = $(BSP_DIR)/build
LD_FILES = $(ROOT_DIR)/bsp/CH32V208/libraries/Ld/link.lds



FLAGS += -march=rv32imac -mabi=ilp32 -msmall-data-limit=8 -msave-restore -Os -fmessage-length=0 -fsigned-char -ffunction-sections -fdata-sections -fno-common -Wunused -Wuninitialized  -g -std=gnu99 -DCH32V20x_D8W 



C_FLAGS += $(CC) $(CFLAGS) -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@)" -c -o "$@" "$<"
AS_FLAGS += $(CC) $(AFLAGS) -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@)" -c -o "$@" "$<"

LINK_FLAGS += $(CC) $(LFLAGS) $(EXTERN_LIB)
# --specs=nano.specs 


all: $(BUILD_DIR)/$(TARGET).elf $(BUILD_DIR)/$(TARGET).hex $(BUILD_DIR)/$(TARGET).bin



OBJECT = $(addprefix $(BUILD_DIR)/,$(notdir $(S_FILES:.S=.o)))
vpath %.S $(sort $(dir $(S_FILES)))
OBJECT += $(addprefix $(BUILD_DIR)/,$(notdir $(C_FILES:.c=.o)))
vpath %.c $(sort $(dir $(C_FILES)))

OBJECTS += $(sort $(OBJECT))


$(BUILD_DIR)/%.o:%.S Makefile | $(BUILD_DIR)
	$(AS_FLAGS)

$(BUILD_DIR)/%.o:%.c Makefile | $(BUILD_DIR)
	$(C_FLAGS)

$(BUILD_DIR)/$(TARGET).elf: $(OBJECTS) | Makefile
	$(LINK_FLAGS) $(OBJECTS) -o $@
	$(SZ) --format=berkeley $@

$(BUILD_DIR)/%.hex: $(BUILD_DIR)/%.elf | $(BUILD_DIR)
	$(HEX) $< $@

$(BUILD_DIR)/%.bin: $(BUILD_DIR)/%.elf | $(BUILD_DIR)
	$(BIN)  $< $@

$(BUILD_DIR):
	@echo $(OBJECTS)
	mkdir $@

DATE = $(shell date)
push:
	git add $(RTT_ROOT)
	git commit -m "update :$(DATE)"
	git push origin/main

c:
	rmdir	 /s /q build

```

其中`include config.mk`和`include src.mk`这2个在Bsp项目同一个文件夹下新建，内容是追加头文件，目标C后缀源代码，还有一些编译选项等等。

拿官方的例子，来验证测试是否正常，毕竟是用makefile，不确定这个项目编译是否有效果？

```c

#define LED0 rt_pin_get("PA.0")

int main(void)
{
    rt_pin_mode(LED0,PIN_MODE_OUTPUT);
    rt_kprintf("MCU-CH32V208WBU6\r\n");
    while(1)
    {
        rt_pin_write(LED0, PIN_HIGH);
        rt_thread_mdelay(500);
        rt_pin_write(LED0, PIN_LOW);
        rt_thread_mdelay(500);
    }
}
```

## 演示
![ledoff.png](https://file1.elecfans.com/web2/M00/88/A6/wKgaomRt9KKAG-aBAAKJh01eNRk559.png) ![ledon.png](https://file1.elecfans.com/web2/M00/88/A6/wKgZomRt9MiAPEiPAANvji-S4Nw231.png)


# 代码

传送门： [github->01LED](https://github.com/rx-ted/IOT/tree/main/bsp/wch/risc-v/ch32v208w-r0/applications/01LED)