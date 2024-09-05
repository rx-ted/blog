---
title: 【国民技术N32项目移植】基于Arduino简单版的点灯项目移植
date: 2023-03-04 22:53:38
tags: 国民技术N32项目移植
---

<!--
 * @Author: rx-ted
 * @Date: 2023-02-18 21:30:26
 * @LastEditors: rx-ted
 * @LastEditTime: 2023-03-04 22:59:06
-->
# 【国民技术N32项目移植】基于Arduino简单版的点灯项目移植

N32G4FR 简单移植arduino库，简单点灯熄灯，延迟开灯等  
反复的点亮LED一秒钟，然后关闭LED一秒钟。

## 功能

```c
// 创建Arduino.h
// 模仿函数
/**
 *  pinMode()
 * @param pin—引脚 GPIO序号 查看pin.c源代码
 * @param Mode—模式 1.输出(OUTPUT)模式;2.输入(INPUT)模式;3.输入上拉（INPUT_PULLUP）模式 
 */
pinMode(pin,Mode) // 函数：定义引脚模式

/**
 * digitalWrite()
 * @param pin：GPIO序号 查看pin.c源代码
 * @param value：HIGH或LOW
 */
digitalWrite(pin, value)
/**
 * delay()
 * @param ms 多少毫秒
 */
delay(ms)
//for example
int main(){
    int ledPin = PIN_GET(B,5);//定义引脚D3
    pinMode( ledPin, OUTPUT);
    while(1){
    digitalWrite(ledPin, HIGH);//LED灯亮
    delay(1000);//等待1秒
    digitalWrite(ledPin, LOW);//LED灯灭
    delay(1000);
    }
}

```

## 代码

```c


#include "drv_gpio.h"
#include "drv_usart.h"
#include "pin.h"
#include "serial.h"
#include <rtthread.h>

#ifdef RT_USING_DFS
/* dfs filesystem:ELM filesystem init */
#include <dfs_elm.h>
/* dfs Filesystem APIs */
#include <dfs_fs.h>
#endif

#ifdef RT_USING_RTGUI
#include <rtgui/calibration.h>
#include <rtgui/driver.h>
#include <rtgui/rtgui.h>
#include <rtgui/rtgui_server.h>
#include <rtgui/rtgui_system.h>
#endif

/* Official Arduino */
#define LOW 0x0
#define HIGH 0x1
#define CHANGE 0x2
#define FALLING 0x3
#define RISING 0x4


#define INPUT 0x0
#define OUTPUT 0x1
#define INPUT_PULLUP 0x2
/* RT-Thread extension */
#define INPUT_FLOATING INPUT
#define INPUT_PULLDOWN 0x3
#define OUTPUT_OPEN_DRAIN 0x4


ALIGN(RT_ALIGN_SIZE)
static rt_uint8_t led0_stack[512], led1_stack[512];

static struct rt_thread led0_thread;
static struct rt_thread led1_thread;

#define LED1_PIN GET_PIN(A, 8)
#define LED3_PIN GET_PIN(B, 5)

/**
 * @brief  led0 thread entry
 */
static void led0_thread_entry(void *parameter)
{
    while (1)
    {
        rt_thread_delay(50); // delay 500ms
        rt_pin_write(LED1_PIN, PIN_HIGH);
        rt_thread_delay(50); // delay 500ms
        rt_pin_write(LED1_PIN, PIN_LOW);
    }
}

/**
 * @brief  led1 thread entry
 */
static void led1_thread_entry(void *parameter)
{
    while (1)
    {
        rt_thread_delay(25); // delay 250ms
        rt_pin_write(LED3_PIN, PIN_HIGH);
        rt_thread_delay(25); // delay 250ms
        rt_pin_write(LED3_PIN, PIN_LOW);
    }
}

#ifdef RT_USING_RTGUI
rt_bool_t cali_setup(void)
{
    rt_kprintf("cali setup entered\n");
    return RT_FALSE;
}

void cali_store(struct calibration_data *data)
{
    rt_kprintf("cali finished (%d, %d), (%d, %d)\n",
               data->min_x,
               data->max_x,
               data->min_y,
               data->max_y);
}
#endif /* RT_USING_RTGUI */

int led1()
{
    rt_pin_mode(LED1_PIN, PIN_MODE_OUTPUT);
    rt_err_t result;
    /* init led0 thread */
    result = rt_thread_init(&led0_thread, "led0", led0_thread_entry, RT_NULL, (rt_uint8_t *)&led0_stack[0], sizeof(led0_stack), 4, 5);
    if (result != RT_EOK)
    {
        rt_kprintf("create task for red led is failed!\n");
        return -1;
    }
    rt_thread_startup(&led0_thread);
    return 0;
}

int led2()
{
    rt_pin_mode(LED3_PIN, PIN_MODE_OUTPUT);
    rt_err_t result;
    /* init led1 thread */
    result = rt_thread_init(&led1_thread, "led1", led1_thread_entry, RT_NULL, (rt_uint8_t *)&led1_stack[0], sizeof(led1_stack), 5, 5);
    if (result != RT_EOK)
    {
        rt_kprintf("create task for green led is failed!\n");
        return -1;
    }
    rt_thread_startup(&led1_thread);
    return 0;
}


void pinMode(uint8_t pin, uint8_t mode)
{
    rt_base_t rt_mode;

    switch(mode)
    {
    case INPUT:
        rt_mode = PIN_MODE_INPUT;
        break;

    case OUTPUT:
        rt_mode = PIN_MODE_OUTPUT;
        break;

    case INPUT_PULLUP:
        rt_mode = PIN_MODE_INPUT_PULLUP;
        break;

    case INPUT_PULLDOWN:
        rt_mode = PIN_MODE_INPUT_PULLDOWN;
        break;

    case OUTPUT_OPEN_DRAIN:
        rt_mode = PIN_MODE_OUTPUT_OD;
        break;

    default:
        rt_mode = RT_NULL;
        // LOG_E("pinMode mode parameter is illegal");
        return;
    }
    rt_pin_mode(pin, rt_mode);
}


void digitalWrite(uint8_t pin, uint8_t val)
{
    rt_base_t rt_val;
    if(val == HIGH)
    {
        rt_val = PIN_HIGH;
    }
    else if(val == LOW)
    {
        rt_val = PIN_LOW;
    }
    else
    {
        return;
    }
    rt_pin_write(pin, rt_val);
}

void delay(unsigned long ms){
    rt_thread_mdelay(ms);
}

/**
 * @brief  Main program
 */
int main(void)
{

    pinMode( LED1_PIN, OUTPUT);
    while(1){
    digitalWrite(LED1_PIN, HIGH);//LED灯亮
    delay(1000);//等待1秒
    digitalWrite(LED1_PIN, LOW);//LED灯灭
    delay(1000);
    }
    return 0;
}

MSH_CMD_EXPORT(led1, "red led blink")
MSH_CMD_EXPORT(led2, "blue led blink")

/*@}*/
//

```

## 总结

实现了，脑子会想到与N32G4FR和Arduino完全相同的，是的arduino上的语法N32G4FR都兼容的。这让我们面对N32G4FR时省了不少的功夫.

## 演示结果

![title-ledBlink](https://video-community.csdnimg.cn/vod-84deb4/36fe8520b0c171eda8877035d0b20102/snapshots/8b5c53c1787646d9b1859a01c2fe8ae9-00002.jpg?auth_key=4830457980-0-0-b219a611407df248052228c34bc1797f)

<video controls height='200px' width='200px' src="https://live.csdn.net/v/embed/277081"></video>
