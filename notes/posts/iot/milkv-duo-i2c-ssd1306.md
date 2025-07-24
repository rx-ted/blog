---
title: milkv-Linux下i2c驱动OLED ssd1306
date: 2023-07-18 17:45:19
tag: [IOT,嵌入式,milkv]
description: linux驱动移植-I2C驱动移植（OLED SSD1306）
---

# linux驱动移植-I2C驱动移植(OLED SSD1306)

## 参数

- ssd1306  
- 128*32  
- 0x3c  
- i2c0

## dts修改

```c
// build/boards/cv180x/cv1800b_milkv_duo_sd/dts_riscv/cv1800b_milkv_duo_sd.dts 
// 速率 名称 地址，随便修改，一旦有新的设备地址，可以在i2c0下追加新设备
&i2c0 {
        status = "okay";
        ssd1306:ssd1306@3c {
                compatible = "oled12832,ssd1306";
                reg = <0x3c>;
        };

};

```

## 编译

修改好了dts设备树，需要重新编译，见教程：[传送](https://github.com/milkv-duo/duo-buildroot-sdk/tree/develop)
最后得到image镜像，在milkv-duo上烧录即可。

```bash
i2cdetect -yr 0 
# 可以看到0x3c位置
# 等到导入KO文件，就变成UU，表示成功

```

## 源代码获取KO文件

在sdk下新建driver，然后再新建ssd1306文件夹，接着新文件命名为ssd1306.c，不想分头文件  
借鉴某位大佬源代码，稍微修改

```c
#include <linux/cdev.h>
#include <linux/device.h>
#include <linux/fs.h>
#include <linux/i2c.h>
#include <linux/init.h>
#include <linux/kdev_t.h>
#include <linux/module.h>
#include <linux/stat.h>
#include <linux/uaccess.h>

/*
 全局静态变量：希望全局变量仅限于在本源文件中使用，在其他源文件中不能引用，也就是说限制其作用域只在
 定义该变量的源文件内有效，而在同一源程序的其他源文件中不能使用
 */
#define OK (0)
#define ERROR (-1)

/* I2C设备驱动 */
static struct i2c_driver oled_driver;

/* I2C从设备 */
static struct i2c_client *oled_client;

/* i2c设备地址 */
static unsigned short addr = 0x3C;

/* i2c驱动需要探测的从设备地址 */
static unsigned short address_list[] = {0x3c, 0xfffeU}; // 0xfffeU 结束标志

/* 设备编号 */
static dev_t devid;

/* 设备class */
static struct class *oled_class;

/* oled字符设备哦 */
static struct cdev i2c_cdev;

/*****************************************************************************************************
 *
 *        从ASCII0x20开始   取模方向：逐列式  每列1个字节，共6列    即一个字节占8行6列
 *      取模走向：低位在前
 *
 *****************************************************************************************************/
static const u8 ASCII6x8[][6] =
    {
        {0x00, 0x00, 0x00, 0x00, 0x00, 0x00}, // sp          ASCII 0x20
        {0x00, 0x00, 0x00, 0x2f, 0x00, 0x00}, // !
        {0x00, 0x00, 0x07, 0x00, 0x07, 0x00}, // "
        {0x00, 0x14, 0x7f, 0x14, 0x7f, 0x14}, // #
        {0x00, 0x24, 0x2a, 0x7f, 0x2a, 0x12}, // $
        {0x00, 0x62, 0x64, 0x08, 0x13, 0x23}, // %
        {0x00, 0x36, 0x49, 0x55, 0x22, 0x50}, // &
        {0x00, 0x00, 0x05, 0x03, 0x00, 0x00}, // '
        {0x00, 0x00, 0x1c, 0x22, 0x41, 0x00}, // (
        {0x00, 0x00, 0x41, 0x22, 0x1c, 0x00}, // )
        {0x00, 0x14, 0x08, 0x3E, 0x08, 0x14}, // *
        {0x00, 0x08, 0x08, 0x3E, 0x08, 0x08}, // +
        {0x00, 0x00, 0x00, 0xA0, 0x60, 0x00}, // ,
        {0x00, 0x08, 0x08, 0x08, 0x08, 0x08}, // -
        {0x00, 0x00, 0x60, 0x60, 0x00, 0x00}, // .
        {0x00, 0x20, 0x10, 0x08, 0x04, 0x02}, // /
        {0x00, 0x3E, 0x51, 0x49, 0x45, 0x3E}, // 0
        {0x00, 0x00, 0x42, 0x7F, 0x40, 0x00}, // 1
        {0x00, 0x42, 0x61, 0x51, 0x49, 0x46}, // 2
        {0x00, 0x21, 0x41, 0x45, 0x4B, 0x31}, // 3
        {0x00, 0x18, 0x14, 0x12, 0x7F, 0x10}, // 4
        {0x00, 0x27, 0x45, 0x45, 0x45, 0x39}, // 5
        {0x00, 0x3C, 0x4A, 0x49, 0x49, 0x30}, // 6
        {0x00, 0x01, 0x71, 0x09, 0x05, 0x03}, // 7
        {0x00, 0x36, 0x49, 0x49, 0x49, 0x36}, // 8
        {0x00, 0x06, 0x49, 0x49, 0x29, 0x1E}, // 9
        {0x00, 0x00, 0x36, 0x36, 0x00, 0x00}, // :
        {0x00, 0x00, 0x56, 0x36, 0x00, 0x00}, // ;
        {0x00, 0x08, 0x14, 0x22, 0x41, 0x00}, // <
        {0x00, 0x14, 0x14, 0x14, 0x14, 0x14}, // =
        {0x00, 0x00, 0x41, 0x22, 0x14, 0x08}, // >
        {0x00, 0x02, 0x01, 0x51, 0x09, 0x06}, // ?
        {0x00, 0x32, 0x49, 0x59, 0x51, 0x3E}, // @
        {0x00, 0x7C, 0x12, 0x11, 0x12, 0x7C}, // A
        {0x00, 0x7F, 0x49, 0x49, 0x49, 0x36}, // B
        {0x00, 0x3E, 0x41, 0x41, 0x41, 0x22}, // C
        {0x00, 0x7F, 0x41, 0x41, 0x22, 0x1C}, // D
        {0x00, 0x7F, 0x49, 0x49, 0x49, 0x41}, // E
        {0x00, 0x7F, 0x09, 0x09, 0x09, 0x01}, // F
        {0x00, 0x3E, 0x41, 0x49, 0x49, 0x7A}, // G
        {0x00, 0x7F, 0x08, 0x08, 0x08, 0x7F}, // H
        {0x00, 0x00, 0x41, 0x7F, 0x41, 0x00}, // I
        {0x00, 0x20, 0x40, 0x41, 0x3F, 0x01}, // J
        {0x00, 0x7F, 0x08, 0x14, 0x22, 0x41}, // K
        {0x00, 0x7F, 0x40, 0x40, 0x40, 0x40}, // L
        {0x00, 0x7F, 0x02, 0x0C, 0x02, 0x7F}, // M
        {0x00, 0x7F, 0x04, 0x08, 0x10, 0x7F}, // N
        {0x00, 0x3E, 0x41, 0x41, 0x41, 0x3E}, // O
        {0x00, 0x7F, 0x09, 0x09, 0x09, 0x06}, // P
        {0x00, 0x3E, 0x41, 0x51, 0x21, 0x5E}, // Q
        {0x00, 0x7F, 0x09, 0x19, 0x29, 0x46}, // R
        {0x00, 0x46, 0x49, 0x49, 0x49, 0x31}, // S
        {0x00, 0x01, 0x01, 0x7F, 0x01, 0x01}, // T
        {0x00, 0x3F, 0x40, 0x40, 0x40, 0x3F}, // U
        {0x00, 0x1F, 0x20, 0x40, 0x20, 0x1F}, // V
        {0x00, 0x3F, 0x40, 0x38, 0x40, 0x3F}, // W
        {0x00, 0x63, 0x14, 0x08, 0x14, 0x63}, // X
        {0x00, 0x07, 0x08, 0x70, 0x08, 0x07}, // Y
        {0x00, 0x61, 0x51, 0x49, 0x45, 0x43}, // Z
        {0x00, 0x00, 0x7F, 0x41, 0x41, 0x00}, // [
        {0x00, 0x55, 0x2A, 0x55, 0x2A, 0x55}, // 55
        {0x00, 0x00, 0x41, 0x41, 0x7F, 0x00}, // ]
        {0x00, 0x04, 0x02, 0x01, 0x02, 0x04}, // ^
        {0x00, 0x40, 0x40, 0x40, 0x40, 0x40}, // _
        {0x00, 0x00, 0x01, 0x02, 0x04, 0x00}, // '
        {0x00, 0x20, 0x54, 0x54, 0x54, 0x78}, // a
        {0x00, 0x7F, 0x48, 0x44, 0x44, 0x38}, // b
        {0x00, 0x38, 0x44, 0x44, 0x44, 0x20}, // c
        {0x00, 0x38, 0x44, 0x44, 0x48, 0x7F}, // d
        {0x00, 0x38, 0x54, 0x54, 0x54, 0x18}, // e
        {0x00, 0x08, 0x7E, 0x09, 0x01, 0x02}, // f
        {0x00, 0x18, 0xA4, 0xA4, 0xA4, 0x7C}, // g
        {0x00, 0x7F, 0x08, 0x04, 0x04, 0x78}, // h
        {0x00, 0x00, 0x44, 0x7D, 0x40, 0x00}, // i
        {0x00, 0x40, 0x80, 0x84, 0x7D, 0x00}, // j
        {0x00, 0x7F, 0x10, 0x28, 0x44, 0x00}, // k
        {0x00, 0x00, 0x41, 0x7F, 0x40, 0x00}, // l
        {0x00, 0x7C, 0x04, 0x18, 0x04, 0x78}, // m
        {0x00, 0x7C, 0x08, 0x04, 0x04, 0x78}, // n
        {0x00, 0x38, 0x44, 0x44, 0x44, 0x38}, // o
        {0x00, 0xFC, 0x24, 0x24, 0x24, 0x18}, // p
        {0x00, 0x18, 0x24, 0x24, 0x18, 0xFC}, // q
        {0x00, 0x7C, 0x08, 0x04, 0x04, 0x08}, // r
        {0x00, 0x48, 0x54, 0x54, 0x54, 0x20}, // s
        {0x00, 0x04, 0x3F, 0x44, 0x40, 0x20}, // t
        {0x00, 0x3C, 0x40, 0x40, 0x20, 0x7C}, // u
        {0x00, 0x1C, 0x20, 0x40, 0x20, 0x1C}, // v
        {0x00, 0x3C, 0x40, 0x30, 0x40, 0x3C}, // w
        {0x00, 0x44, 0x28, 0x10, 0x28, 0x44}, // x
        {0x00, 0x1C, 0xA0, 0xA0, 0xA0, 0x7C}, // y
        {0x00, 0x44, 0x64, 0x54, 0x4C, 0x44}, // z
        {0x14, 0x14, 0x14, 0x14, 0x14, 0x14}  // horiz lines
};

/*************************************************************
 *
 *  Function  : 通过SPI协议写命令
 *  Input     : data 数据
 *  Return    : 写入字节长度  负数写入失败
 *
 **************************************************************/
static int oled_write_cmd(unsigned char cmd)
{

    struct i2c_msg msg[1];
    unsigned char cmds[2];

    cmds[0] = 0x00;
    cmds[1] = cmd;

    /* 数据传输三要素：源，目的，长度 */
    msg[0].addr = oled_client->addr; /* 目的 */
    msg[0].buf = cmds;               /* 源 */
    msg[0].len = 2;                  /* 长度为字节 =  数据 + 地址 */
    msg[0].flags = 0;                /* 0表示写 */

    if (i2c_transfer(oled_client->adapter, msg, 1) == 1)
        return 2;
    else
        return ERROR;
}

/*************************************************************
 *
 *  Function  : 通过SPI协议写数据
 *  Input     : data 数据
 *  Return    : 写入字节长度  负数写入失败
 *
 **************************************************************/
static int oled_write_data(unsigned char data)
{
    struct i2c_msg msg[1];
    unsigned char datas[2];

    datas[0] = 0x40;
    datas[1] = data;

    /* 数据传输三要素：源，目的，长度 */
    msg[0].addr = oled_client->addr; /* 目的 */
    msg[0].buf = datas;              /* 源 */
    msg[0].len = 2;                  /* 长度为2字节 =  数据 + 地址 */
    msg[0].flags = 0;                /* 0表示写 */

    if (i2c_transfer(oled_client->adapter, msg, 1) == 1)
        return 2;
    else
        return ERROR;
}

/*************************************************************
 *
 *  Function  : 坐标设定
 *  Input     : x x坐标    0x00~0x7F
 *              y y坐标    0~7
 *
 **************************************************************/
static void oled_pos(u8 x, u8 y)
{
    oled_write_cmd(0xB0 + y);
    oled_write_cmd(((x & 0xF0) >> 4) | 0x10); /* 设置列地址高四位 */
    oled_write_cmd(x & 0x0F);                 /* 设置列地址低四位 */
}

/*************************************************************
 *
 *  Function  : 清屏
 *
 **************************************************************/
static void oled_clear(void)
{
    u8 x;
    u8 y;
    for (y = 0; y < 8; y++)
    {
        oled_write_cmd(0xB0 + y); /* 选择页 */
        oled_write_cmd(0x00);     /* 设置列地址低四位 */
        oled_write_cmd(0x10);     /* 设置列地址高四位 */
        for (x = 0; x < 0x80; x++)
            oled_write_data(0x00); /* 每次清1列 */
    }
}

/***************************************************************************************************
 *
 *    Function   : 写入一组标准ASCII字符串 一个字节占8行6列
 *    Input      : x 设置列地址0~0X7F
 *                 y 设置页地址0~7
 *                 str 要显示的字符
 *
 **************************************************************************************************/
static void oled_p6x8str(u8 x, u8 y, u8 *str)
{
    u8 i = 0;
    u8 j = 0;
    u8 k = 0;
    while (str[j] != '\0')
    {
        while ((str[j] < 0x20) || (str[j] > 0x80)) /* 当写入的没有对应的点阵时 显示空格 */
            str[j] = 32;
        k = str[j] - 32;
        if (x > 121)
        {
            x = 0;
            y++;
        }
        oled_pos(x, y); /* 选中坐标 */
        for (i = 0; i < 6; i++)
            oled_write_data(ASCII6x8[k][i]); /* 写入一个字节 */
        x += 6;
        j++;
    }
}

/********
 * oled init
 */

static int oledinit(void)
{

    oled_write_cmd(0xAE); /* 显示关 */
    oled_write_cmd(0x40); /* 设置列低位地址 */
    oled_write_cmd(0xB0); /* 设置列高位地址 */
    oled_write_cmd(0xC8); 
    oled_write_cmd(0x81); 
    oled_write_cmd(0xFF); 
    oled_write_cmd(0xA1); 
    oled_write_cmd(0xA6); 
    oled_write_cmd(0xA8); 
    oled_write_cmd(0x1F); 
    oled_write_cmd(0xD3); 
    oled_write_cmd(0x00); 
    oled_write_cmd(0xD5); 
    oled_write_cmd(0xF0); 
    oled_write_cmd(0xD9); 
    oled_write_cmd(0x22); 
    oled_write_cmd(0xDA); 
    oled_write_cmd(0x02); 
    oled_write_cmd(0xDB); 
    oled_write_cmd(0x49); 
    oled_write_cmd(0x8D); 
    oled_write_cmd(0x14); 
    oled_write_cmd(0xAF);

    return 0;
}

/***************************************************************************************************
 *
 * 打开设备
 *
 **************************************************************************************************/
static int oled_open(struct inode *inode, struct file *filp)
{
    // oled_write_cmd(0xAE); /* 显示关 */
    // oled_write_cmd(0x00); /* 设置列低位地址 */
    // oled_write_cmd(0x10); /* 设置列高位地址 */
    // oled_write_cmd(0x40); /* set start line address  Set Mapping RAM Display Start Line (0x00~0x3F) */
    // oled_write_cmd(0x81); /* 设置对比度 */
    // oled_write_cmd(0xCF); /* 值越大 越亮 */
    // oled_write_cmd(0xA1); /* 设置列左右反置     0xa0左右反置 0xa1正常 */
    // oled_write_cmd(0xC8); /* 设置行上下反置     0xc0上下反置 0xc8正常 */
    // oled_write_cmd(0xA6); /* 设置正常显示 */
    // oled_write_cmd(0x20); /* 设置页地址模式 (0x00/0x01/0x02) */
    // oled_write_cmd(0x02); /* 页寻址 */
    // oled_write_cmd(0x8D); /* 设置电荷磊开关 */
    // oled_write_cmd(0x14); /* 电荷磊开 */
    // oled_write_cmd(0xA4); /* 字符显示开关 0xA4：开  0xA5：关 */
    // oled_write_cmd(0xA6); /* 背景色显示开关  0xA6:关   0xA7:开 */
    // oled_write_cmd(0xAF); /* 显示开 */
    oledinit();
    oled_clear(); /* 初始清屏 */
    oled_pos(0, 0);

    printk(KERN_INFO "oled open\n");
    return 0;
}

/***************************************************************************************************
 *
 *   Function:    oled写函数
 *   Input       : buffer 2个字节 第一个字节oled片内地址0~0xFF，第二个字节为要写入的数据
 *                 size  写数据的长度  两个字节
 *
 **************************************************************************************************/
static ssize_t oled_write(struct file *filp, const char __user *buffer, size_t size, loff_t *off)
{
    // 一共可以显示168字
    unsigned char data[168];
    copy_from_user(data, buffer, 168);
    oled_p6x8str(0, 0, data);
    return 0;
}

/*
 * oled操作集
 */
static struct file_operations oled_fops = {
    .owner = THIS_MODULE,
    .write = oled_write,
    .open = oled_open,
};

/*
 * 当驱动和设备信息匹配成功之后，就会调用probe函数，驱动所有的资源的注册和初始化全部放在probe函数中；
 */
static int oled_probe(struct i2c_client *client, const struct i2c_device_id *i2c_device)
{
    int result;
    /* 动态分配字符设备编号: (major,0) */
    if (alloc_chrdev_region(&devid, 0, 1, "oled") == OK)
    {
        printk(KERN_INFO "alloc device number : major:[%d], minor:[%d] succeed!\n", MAJOR(devid), MINOR(devid));
    }
    else
    {
        printk(KERN_INFO "register device number error!\n");
        return ERROR;
    }

    /* 字符设备初始化以及注册 */
    cdev_init(&i2c_cdev, &oled_fops);
    cdev_add(&i2c_cdev, devid, 1);

    /* 创建类,它会在sys目录下创建/sys/class/oled_class这个类  */
    oled_class = class_create(THIS_MODULE, "oled_class");
    if (IS_ERR(oled_class))
    {
        printk("can't create class\n");
        return ERROR;
    }

    /*  在/sys/class/oled_class下创建oled设备，然后mdev通过这个自动创建/dev/oled这个设备节点 */
    device_create(oled_class, NULL, devid, NULL, "oled");
    printk(KERN_INFO "create device file 'oled' succeed!\n");

    /* 保存当前i2c_client */
    oled_client = client;
    printk(KERN_INFO "get i2c_client, client name = %s, addr = 0x%x\n", oled_client->name, oled_client->addr);
    printk(KERN_INFO "get i2c_adapter, adapter name = %s\n", oled_client->adapter->name);

    printk(KERN_INFO "oled probe\n");
    return 0;
}

/*
 * 设备被移除了，或者驱动被卸载了，全部要释放，释放资源的操作就放在该函数中
 */
static int oled_remove(struct i2c_client *client)
{
    /* 注销类、以及类设备 /sys/class/oled_class会被移除*/
    device_destroy(oled_class, devid);
    class_destroy(oled_class);

    /* 移除字符设备 */
    cdev_del(&i2c_cdev);

    /* 注销设备编号 */
    unregister_chrdev_region(devid, 1);
    printk(KERN_INFO "oled remove\n");
    return 0;
}

/*
 * oled设备探测到的回调函数
 */
static int oled_detect(struct i2c_client *client, struct i2c_board_info *info)
{
    printk(KERN_INFO "oled detect success\n");

    // 设置I2C从设备名称 必须要和i2c_driver.idtable里面名称匹配
    strcpy(info->type, "oled");
    return OK;
}

/* i2c设备id列表 */
static const struct i2c_device_id oled_id[] = {
    {"ssd1306", 0},
    {} /* 最后一个必须为空,表示结束 */
};

/*
 * i2c驱动入口函数
 */
static struct i2c_driver oled_driver = {
    .probe = oled_probe,
    .remove = oled_remove,
    .driver = {
        .name = "oled", /* 驱动名称 */
        .owner = THIS_MODULE,
    },
    .address_list = address_list, /* 从设备列表 */
    .detect = oled_detect,
    .id_table = oled_id,                      /* id列表 */
    .class = I2C_CLASS_HWMON | I2C_CLASS_SPD, /* 内存设备 */
};

/*
 *init入口函数
 */
static int __init oled_init(void)
{
    i2c_add_driver(&oled_driver); /* 将i2c_driver注册到系统中去 */
    printk(KERN_INFO "oled i2c_driver was added into the system.\n");
    return 0;
}

/*
 * exit出口函数
 */
static void __exit oled_exit(void)
{
    i2c_del_driver(&oled_driver);
    printk(KERN_INFO "oled i2c_driver was deleted from the system.\n");
    return;
}

module_init(oled_init);
module_exit(oled_exit);
MODULE_AUTHOR("rx-ted");
MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("oled device driver, 2023-07-18");

```

再建立makefile，如

```makefile
SDK_DIR = ~/buildroot
KERN_DIR = $(SDK_DIR)/linux_5.10/build/cv1800b_milkv_duo_sd

# app:
#  $(CC) -o ssd1306-app  ssd1306-app.c

all:
 make -C $(KERN_DIR) M=$(PWD) modules

clean:
 make -C $(KERN_DIR) M=$(PWD) modules clean
 rm -rf modules.order

obj-m += ssd1306.o

```

这样可以到一个ssd1306.ko文件

## 传送milkv-duo

将ssd1306.ko传送milkv-duo

```bash

scp driver/ssd1306/ssd1306.ko root@192.168.42.1:/mnt/system/ko

```

进入milkv-duo，这样命令

```bash
# 1. lsmod 先看看两个lsmod前后区别
[root@milkv]~# lsmod
Module                  Size  Used by    Tainted: GF
cvi_vc_driver         879138  0 [permanent]
cv180x_jpeg            25220  1 cvi_vc_driver,[permanent]
cv180x_vcodec          28451  2 cvi_vc_driver,cv180x_jpeg,[permanent]
cv180x_tpu             32041  0 [permanent]
cv180x_clock_cooling     5953  0 [permanent]
cv180x_thermal          3404  0
cv180x_rgn            100809  0 [permanent]
cv180x_dwa             48669  0 [permanent]
cv180x_vpss           280938  0 [permanent]
cv180x_vi             338826  0 [permanent]
snsr_i2c                9341  0 [permanent]
cvi_mipi_rx            54306  0 [permanent]
cv180x_fast_image      32955  0 [permanent]
cv180x_rtos_cmdqu      25922  1 cv180x_fast_image,[permanent]
cv180x_base            96472  8 cvi_vc_driver,cv180x_rgn,cv180x_dwa,cv180x_vpss,cv180x_vi,snsr_i2c,cvi_mipi_rx,cv180x_rtos_cmdqu,[permanent]
cv180x_sys             64161  7 cvi_vc_driver,cv180x_rgn,cv180x_dwa,cv180x_vpss,cv180x_vi,cv180x_fast_image,cv180x_base,[permanent]

# 2. insmod /mnt/system/ko/ssd1306.ko
[root@milkv]~# insmod /mnt/system/ko/ssd1306.ko

# 3. lsmod
[root@milkv]~# lsmod
Module                  Size  Used by    Tainted: GF
ssd1306                 5654  0
cvi_vc_driver         879138  0 [permanent]
cv180x_jpeg            25220  1 cvi_vc_driver,[permanent]
cv180x_vcodec          28451  2 cvi_vc_driver,cv180x_jpeg,[permanent]
cv180x_tpu             32041  0 [permanent]
cv180x_clock_cooling     5953  0 [permanent]
cv180x_thermal          3404  0
cv180x_rgn            100809  0 [permanent]
cv180x_dwa             48669  0 [permanent]
cv180x_vpss           280938  0 [permanent]
cv180x_vi             338826  0 [permanent]
snsr_i2c                9341  0 [permanent]
cvi_mipi_rx            54306  0 [permanent]
cv180x_fast_image      32955  0 [permanent]
cv180x_rtos_cmdqu      25922  1 cv180x_fast_image,[permanent]
cv180x_base            96472  8 cvi_vc_driver,cv180x_rgn,cv180x_dwa,cv180x_vpss,cv180x_vi,snsr_i2c,cvi_mipi_rx,cv180x_rtos_cmdqu,[permanent]
cv180x_sys             64161  7 cvi_vc_driver,cv180x_rgn,cv180x_dwa,cv180x_vpss,cv180x_vi,cv180x_fast_image,cv180x_base,[permanent]
# 4. dmesg
[root@milkv]~# dmesg
[  412.711906] create device file 'oled' succeed!
[  412.711920] get i2c_client, client name = ssd1306, addr = 0x3c
[  412.711927] get i2c_adapter, adapter name = Synopsys DesignWare I2C adapter
[  412.711933] oled probe
[  412.712132] oled i2c_driver was added into the system.
# 打印 hello ssd1306
[root@milkv]~# echo hello ssd1306 > /dev/oled
^C
[root@milkv]~# echo 1234567890 qwertyuiopasdfghjklzxcvbnm > /dev/oled
^C
```

## 演示效果

![hello-ssd1306.jpg](https://file1.elecfans.com/web2/M00/8D/17/wKgZomS2Z9eAcM3HAAENkrlzuvg009.jpg)

![ssd1306-example.jpg](https://file1.elecfans.com/web2/M00/8D/17/wKgZomS2Z-CAPKrTAADA-I9hOvI674.jpg)
