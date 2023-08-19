---
title:  DSC28034PNT-基于定时器和PWM输出三色灯
date: 2023-07-31 21:25:43
excerpt: DSC28034PNT-基于定时器和PWM输出三色灯项目旨在利用DSC28034PNT嵌入式开发平台的强大功能，通过定时器和PWM技术实现对三色灯的精确控制，实现了三色灯的控制。该项目旨在通过控制不同的PWM占空比来调节三色灯的亮度，从而实现丰富多彩的灯光效果。本项目适用于工业控制、物联网和智能家居等领域，为用户提供灵活且高效的光照控制方案。
tags: [IOT,嵌入式]
---
<!--
 * @Author: rx-ted
 * @Date: 2023-07-31 21:25:43
 * @LastEditors: rx-ted
 * @LastEditTime: 2023-07-31 21:40:56
-->
# DSC28034PNT-基于定时器和PWM输出三色灯

## 概述

DSC28034PNT-基于定时器和PWM输出三色灯项目旨在利用DSC28034PNT嵌入式开发平台的强大功能，通过定时器和PWM技术实现对三色灯的精确控制，实现了三色灯的控制。该项目旨在通过控制不同的PWM占空比来调节三色灯的亮度，从而实现丰富多彩的灯光效果。本项目适用于工业控制、物联网和智能家居等领域，为用户提供灵活且高效的光照控制方案。
本项目具有灵活性和高性能，适用于各种应用场景，如工业控制、物联网和智能家居。

> 可惜没有pwm灯光我由于时间不够，赶紧简单写个程序，简单测试三色灯效果。若有兴趣深入可以研究哈
1
2
3

## 软件调试

在软件调试阶段，首先需要编写适配DSC28034PNT的控制程序。通过设置定时器的频率和周期，以及不同颜色灯的PWM占空比，可以实现三色灯的亮度控制。在编写代码的过程中，需要注意定时器的配置和中断处理函数的编写，确保定时器能够精确地产生PWM信号。调试过程中需要使用调试工具监视变量和时序，以确保程序的正确性和稳定性。

1

```c
#include "dsc_config.h"
#include <syscalls.h>
#include "IQmathLib.h"

#define led0 GpioDataRegs.GPADAT.bit.GPIO7
#define led1 GpioDataRegs.GPADAT.bit.GPIO8
#define led2 GpioDataRegs.GPADAT.bit.GPIO9

uint16_t IntCount = 0;
INTERRUPT void timer0_isr(void);
void delay(int second);
void softPwmWrite(Uint32 pin, int brightness);

void InitLED(void) {
	EALLOW;

//	GpioCtrlRegs.GPBMUX1.bit.GPIO44 = 0; /* 普通IO,对应D402，LED灯 */
//	GpioCtrlRegs.GPBDIR.bit.GPIO44 = 1; /* 输出IO */
	// led303
	GpioCtrlRegs.GPAMUX1.bit.GPIO7 = 0;
	GpioCtrlRegs.GPADIR.bit.GPIO7 = 1;
	GpioCtrlRegs.GPAQSEL1.bit.GPIO7 = 1;

	GpioCtrlRegs.GPAMUX1.bit.GPIO8 = 0;
	GpioCtrlRegs.GPADIR.bit.GPIO8 = 1;
	GpioCtrlRegs.GPAQSEL1.bit.GPIO8 = 1;

	GpioCtrlRegs.GPAMUX1.bit.GPIO9 = 0;
	GpioCtrlRegs.GPADIR.bit.GPIO9 = 1;
	GpioCtrlRegs.GPAQSEL1.bit.GPIO9 = 1;
	EDIS;

}

void InitTimer() {
	DINT;
	// 关闭CPU中断
	InitPieCtrl();
	//关闭清除CPU中断标记位
	IER = 0X0000;
	IFR = 0X0000;
//	初始化中断向量表
	InitPieVectTable();
	EALLOW;
//	配置中断向量表
	PieVectTable.TINT0 = &timer0_isr;
	EDIS;
	EALLOW;
	//初始化模块
	CpuTimer0Regs.TCR.bit.TSS = 1;
	CpuTimer0Regs.PRD.all = 120000;
	CpuTimer0Regs.TCR.bit.TIF = 1;
	CpuTimer0Regs.TCR.bit.TRB = 1;
	CpuTimer0Regs.TCR.bit.TIE = 1;
	CpuTimer0Regs.TCR.bit.TSS = 0;
	EDIS;
//使能CPU中断
	IER |= M_INT1;
//	使能pie中断
	PieCtrlRegs.PIEIER1.bit.INTx7 = 1;
	EINT;
	ERTM;
}

int main(void) {

	InitFlash();
	InitSysCtrl();  //Initializes the System Control registers to a known state.

	InitLED();

	InitTimer();

	while (1) {

		for (int i = 0; i < 256; i++) {
			if (i < 20) {
				led0 = 1;
			} else {
				led0 = 0;
			}
			delay(10); // 控制PWM周期，可根据需要调整延时时间
		}
		for (int i = 0; i < 256; i++) {
			if (i < 100) {
				led1 = 1;
			} else {
				led1 = 0;
			}
			delay(10); // 控制PWM周期，可根据需要调整延时时间
		}
		for (int i = 0; i < 256; i++) {
			if (i < 200) {
				led2 = 1;
			} else {
				led2 = 0;
			}
			delay(10); // 控制PWM周期，可根据需要调整延时时间
		}

	}

	return 0;
}

//void CODE_SECTION("ramfuncs")  //有无没区别
void INTERRUPT timer0_isr() {
	IntCount++;
//	GpioDataRegs.GPBTOGGLE.bit.GPIO43 = 1;
	PieCtrlRegs.PIEACK.all = PIEACK_GROUP1;
}

void delay(int second) {
	int start = IntCount;
	while (IntCount - start < second)
		;
}

// ----------------------------------------------------------------------------

```

## 硬件接入

在硬件接入阶段，需要将DSC28034PNT与三色灯电路进行连接。首先，将三色灯的R、G、B引脚分别连接到DSC28034PNT的PWM输出引脚，以便控制其亮度。然后，根据实际需求，将定时器的时钟源、频率和周期配置为合适的值，以产生适当的PWM信号。同时，还需注意电源和接地的连接，确保系统稳定可靠。
1

## 总结

通过软件调试和硬件接入，我们可以实现DSC28034PNT基于定时器和PWM输出三色灯的控制。该项目不仅为用户提供了一个简单易用的光照控制方案，还展示了DSC28034PNT在嵌入式应用中的高性能和灵活性。
