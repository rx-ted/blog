---
title: DSC28034PNT-克隆ssd1306手动模拟i2c
date: 2023-05-20 13:15:05
excerpt: DSC28034PNT-克隆ssd1306手动模拟i2c
tags: [IOT,嵌入式]
---
<!--
 * @Author: rx-ted
 * @Date: 2023-08-01 22:16:19
 * @LastEditors: rx-ted
 * @LastEditTime: 2023-08-05 14:28:36
-->
# DSC28034PNT-克隆ssd1306手动模拟i2c

ssd1306 sclk sda 对接 gpio18 gpio16

驱动器：SSD1306

分辨率：128*64

屏幕类型：OLED屏

物理接口：i2c

电压：3.3v 5v

## 贴代码

```c

/**
 * ssd1306 i2c oled display
 * 从tft模块引出i2c，如下
 * sclk gpio18
 * sda gpio16
 */


#include "dsc_config.h"
#include <syscalls.h>
#include "IQmathLib.h"
#include"oledfont.h"

u32  IntCount = 0;

//OLED控制用函数
#define OLED_MODE 0
#define SIZE 8
#define XLevelL 0x00
#define XLevelH		0x10
#define Max_Column	128
#define Max_Row		64
#define	Brightness	0xFF
#define X_WIDTH 	128
#define Y_WIDTH 	64
#define OLED_SCL_PIN  GpioDataRegs.GPADAT.bit.GPIO18
#define OLED_SDA_PIN  GpioDataRegs.GPADAT.bit.GPIO16
void OLED_SCLK_Clr() ;
void OLED_SCLK_Set();
void OLED_SDIN_Clr();
void OLED_SDIN_Set();
#define OLED_CMD  0	//写命令
#define OLED_DATA 1	//写数据
void OLED_WR_Byte(unsigned dat, unsigned cmd);
void OLED_Display_On(void);
void OLED_Display_Off(void);
void OLED_Init(void);
void OLED_Clear(void);
void OLED_DrawPoint(u8 x, u8 y, u8 t);
void OLED_Fill(u8 x1, u8 y1, u8 x2, u8 y2, u8 dot);
void OLED_ShowChar(u8 x, u8 y, u8 chr, u8 Char_Size);
void OLED_ShowNum(u8 x, u8 y, u32 num, u8 len, u8 size);
void OLED_ShowString(u8 x, u8 y, u8 *p, u8 Char_Size);
void OLED_Set_Pos(unsigned char x, unsigned char y);
void OLED_ShowCHinese(u8 x, u8 y, u8 no);
void OLED_DrawBMP(unsigned char x0, unsigned char y0, unsigned char x1,
		unsigned char y1, unsigned char BMP[]);
void Delay_50ms(unsigned int Del_50ms);
void Delay_1ms(unsigned int Del_1ms);
void fill_picture(unsigned char fill_Data);
void Picture();
void IIC_Start();
void IIC_Stop();
void Write_IIC_Command(unsigned char IIC_Command);
void Write_IIC_Data(unsigned char IIC_Data);
void Write_IIC_Byte(unsigned char IIC_Byte);
void IIC_Wait_Ack();
INTERRUPT void timer0_isr(void);
void delay(uint32_t ms);
void InitTimer();

//OLED的显存
//存放格式如下.
//[0]0 1 2 3 ... 127
//[1]0 1 2 3 ... 127
//[2]0 1 2 3 ... 127
//[3]0 1 2 3 ... 127
//[4]0 1 2 3 ... 127
//[5]0 1 2 3 ... 127
//[6]0 1 2 3 ... 127
//[7]0 1 2 3 ... 127
/**********************************************
 //IIC Start
 **********************************************/
/**********************************************
 //IIC Start
 **********************************************/
void IIC_Start() {

	OLED_SCLK_Set();
	OLED_SDIN_Set();
	OLED_SDIN_Clr();
	OLED_SCLK_Clr();
}

/**********************************************
 //IIC Stop
 **********************************************/
void IIC_Stop() {
	OLED_SCLK_Set();
//	OLED_SCLK_Clr();
	OLED_SDIN_Clr();
	OLED_SDIN_Set();

}

void IIC_Wait_Ack() {

	//GPIOB->CRH &= 0XFFF0FFFF;	//设置PB12为上拉输入模式
	//GPIOB->CRH |= 0x00080000;
//	OLED_SDA = 1;
//	delay_us(1);
	//OLED_SCL = 1;
	//delay_us(50000);
	/*	while(1)
	 {
	 if(!OLED_SDA)				//判断是否接收到OLED 应答信号
	 {
	 //GPIOB->CRH &= 0XFFF0FFFF;	//设置PB12为通用推免输出模式
	 //GPIOB->CRH |= 0x00030000;
	 return;
	 }
	 }
	 */
	OLED_SCLK_Set();
	OLED_SCLK_Clr();
}
/**********************************************
 // IIC Write byte
 **********************************************/

void Write_IIC_Byte(unsigned char IIC_Byte) {
	unsigned char i;
	unsigned char m, da;
	da = IIC_Byte;
	OLED_SCLK_Clr();
	for (i = 0; i < 8; i++) {
		m = da;
		//	OLED_SCLK_Clr();
		m = m & 0x80;
		if (m == 0x80) {
			OLED_SDIN_Set();
		} else
			OLED_SDIN_Clr();
		da = da << 1;
		OLED_SCLK_Set();
		OLED_SCLK_Clr();
	}

}
/**********************************************
 // IIC Write Command
 **********************************************/
void Write_IIC_Command(unsigned char IIC_Command) {
	IIC_Start();
	Write_IIC_Byte(0x78);            //Slave address,SA0=0
	IIC_Wait_Ack();
	Write_IIC_Byte(0x00);			//write command
	IIC_Wait_Ack();
	Write_IIC_Byte(IIC_Command);
	IIC_Wait_Ack();
	IIC_Stop();
}
/**********************************************
 // IIC Write Data
 **********************************************/
void Write_IIC_Data(unsigned char IIC_Data) {
	IIC_Start();
	Write_IIC_Byte(0x78);			//D/C#=0; R/W#=0
	IIC_Wait_Ack();
	Write_IIC_Byte(0x40);			//write data
	IIC_Wait_Ack();
	Write_IIC_Byte(IIC_Data);
	IIC_Wait_Ack();
	IIC_Stop();
}
void OLED_WR_Byte(unsigned dat, unsigned cmd) {
	if (cmd) {

		Write_IIC_Data(dat);

	} else {
		Write_IIC_Command(dat);

	}

}

/********************************************
 // fill_Picture
 ********************************************/
void fill_picture(unsigned char fill_Data) {
	unsigned char m, n;
	for (m = 0; m < 8; m++) {
		OLED_WR_Byte(0xb0 + m, 0);		//page0-page1
		OLED_WR_Byte(0x00, 0);		//low column start address
		OLED_WR_Byte(0x10, 0);		//high column start address
		for (n = 0; n < 128; n++) {
			OLED_WR_Byte(fill_Data, 1);
		}
	}
}

/***********************Delay****************************************/
void Delay_50ms(unsigned int Del_50ms) {
	unsigned int m;
	for (; Del_50ms > 0; Del_50ms--)
		for (m = 6245; m > 0; m--)
			;
}

void Delay_1ms(unsigned int Del_1ms) {
	unsigned char j;
	while (Del_1ms--) {
		for (j = 0; j < 123; j++)
			;
	}
}

//坐标设置

void OLED_Set_Pos(unsigned char x, unsigned char y) {
	OLED_WR_Byte(0xb0 + y, OLED_CMD);
	OLED_WR_Byte(((x & 0xf0) >> 4) | 0x10, OLED_CMD);
	OLED_WR_Byte((x & 0x0f), OLED_CMD);
}
//开启OLED显示
void OLED_Display_On(void) {
	OLED_WR_Byte(0X8D, OLED_CMD);  //SET DCDC命令
	OLED_WR_Byte(0X14, OLED_CMD);  //DCDC ON
	OLED_WR_Byte(0XAF, OLED_CMD);  //DISPLAY ON
}
//关闭OLED显示
void OLED_Display_Off(void) {
	OLED_WR_Byte(0X8D, OLED_CMD);  //SET DCDC命令
	OLED_WR_Byte(0X10, OLED_CMD);  //DCDC OFF
	OLED_WR_Byte(0XAE, OLED_CMD);  //DISPLAY OFF
}
//清屏函数,清完屏,整个屏幕是黑色的!和没点亮一样!!!
void OLED_Clear(void) {
	u8 i, n;
	for (i = 0; i < 8; i++) {
		OLED_WR_Byte(0xb0 + i, OLED_CMD);    //设置页地址（0~7）
		OLED_WR_Byte(0x00, OLED_CMD);      //设置显示位置—列低地址
		OLED_WR_Byte(0x10, OLED_CMD);      //设置显示位置—列高地址
		for (n = 0; n < 128; n++)
			OLED_WR_Byte(0, OLED_DATA);
	} //更新显示
}
void OLED_On(void) {
	u8 i, n;
	for (i = 0; i < 8; i++) {
		OLED_WR_Byte(0xb0 + i, OLED_CMD);    //设置页地址（0~7）
		OLED_WR_Byte(0x00, OLED_CMD);      //设置显示位置—列低地址
		OLED_WR_Byte(0x10, OLED_CMD);      //设置显示位置—列高地址
		for (n = 0; n < 128; n++)
			OLED_WR_Byte(1, OLED_DATA);
	} //更新显示
}
//在指定位置显示一个字符,包括部分字符
//x:0~127
//y:0~63
//mode:0,反白显示;1,正常显示
//size:选择字体 16/12
void OLED_ShowChar(u8 x, u8 y, u8 chr, u8 Char_Size) {
	unsigned char c = 0, i = 0;
	c = chr - ' '; //得到偏移后的值
	if (x > Max_Column - 1) {
		x = 0;
		y = y + 2;
	}
	if (Char_Size == 16) {
		OLED_Set_Pos(x, y);
		for (i = 0; i < 8; i++)
			OLED_WR_Byte(F8X16[c * 16 + i], OLED_DATA);
		OLED_Set_Pos(x, y + 1);
		for (i = 0; i < 8; i++)
			OLED_WR_Byte(F8X16[c * 16 + i + 8], OLED_DATA);
	} else {
		OLED_Set_Pos(x, y);
		for (i = 0; i < 6; i++)
			OLED_WR_Byte(F6x8[c][i], OLED_DATA);

	}
}
//m^n函数
u32 oled_pow(u8 m, u8 n) {
	u32 result = 1;
	while (n--)
		result *= m;
	return result;
}
//显示2个数字
//x,y :起点坐标
//len :数字的位数
//size:字体大小
//mode:模式	0,填充模式;1,叠加模式
//num:数值(0~4294967295);
void OLED_ShowNum(u8 x, u8 y, u32 num, u8 len, u8 size2) {
	u8 t, temp;
	u8 enshow = 0;
	for (t = 0; t < len; t++) {
		temp = (num / oled_pow(10, len - t - 1)) % 10;
		if (enshow == 0 && t < (len - 1)) {
			if (temp == 0) {
				OLED_ShowChar(x + (size2 / 2) * t, y, ' ', size2);
				continue;
			} else
				enshow = 1;

		}
		OLED_ShowChar(x + (size2 / 2) * t, y, temp + '0', size2);
	}
}
//显示一个字符号串
void OLED_ShowString(u8 x, u8 y, u8 *chr, u8 Char_Size) {
	unsigned char j = 0;
	while (chr[j] != '\0') {
		OLED_ShowChar(x, y, chr[j], Char_Size);
		x += 8;
		if (x > 120) {
			x = 0;
			y += 2;
		}
		j++;
	}
}
//显示汉字
void OLED_ShowCHinese(u8 x, u8 y, u8 no) {
	u8 t;
//	u8 adder = 0;
	OLED_Set_Pos(x, y);
	for (t = 0; t < 16; t++) {
		OLED_WR_Byte(Hzk[2 * no][t], OLED_DATA);
//		adder += 1;
	}
	OLED_Set_Pos(x, y + 1);
	for (t = 0; t < 16; t++) {
		OLED_WR_Byte(Hzk[2 * no + 1][t], OLED_DATA);
//		adder += 1;
	}
}
/***********功能描述：显示显示BMP图片128×64起始点坐标(x,y),x的范围0～127，y为页的范围0～7*****************/
void OLED_DrawBMP(unsigned char x0, unsigned char y0, unsigned char x1,
		unsigned char y1, unsigned char BMP[]) {
	unsigned int j = 0;
	unsigned char x, y;

	if (y1 % 8 == 0)
		y = y1 / 8;
	else
		y = y1 / 8 + 1;
	for (y = y0; y < y1; y++) {
		OLED_Set_Pos(x0, y);
		for (x = x0; x < x1; x++) {
			OLED_WR_Byte(BMP[j++], OLED_DATA);
		}
	}
}

//初始化SSD1306
void OLED_Init(void) {

	EALLOW;

	GpioCtrlRegs.GPAMUX2.bit.GPIO18 = 0;
	GpioCtrlRegs.GPADIR.bit.GPIO18 = 1;
	GpioCtrlRegs.GPAQSEL2.bit.GPIO18 = 0;

	GpioCtrlRegs.GPAMUX2.bit.GPIO16 = 0;
	GpioCtrlRegs.GPADIR.bit.GPIO16 = 1;
	GpioCtrlRegs.GPAQSEL2.bit.GPIO16 = 0;
	EDIS;

	delay(800);
	OLED_WR_Byte(0xAE, OLED_CMD); //--display off
	OLED_WR_Byte(0x00, OLED_CMD); //---set low column address
	OLED_WR_Byte(0x10, OLED_CMD); //---set high column address

	OLED_WR_Byte(0x40, OLED_CMD); //--set start line address
	OLED_WR_Byte(0xB0, OLED_CMD); //--set page address

	OLED_WR_Byte(0x81, OLED_CMD); // contract control
	OLED_WR_Byte(0xFF, OLED_CMD); //--128

	OLED_WR_Byte(0xA1, OLED_CMD); //set segment remap
	OLED_WR_Byte(0xA6, OLED_CMD); //--normal / reverse

	OLED_WR_Byte(0xA8, OLED_CMD); //--set multiplex ratio(1 to 64)
	OLED_WR_Byte(0x3F, OLED_CMD); //--1/32 duty

	OLED_WR_Byte(0xC8, OLED_CMD); //Com scan direction

	OLED_WR_Byte(0xD3, OLED_CMD); //-set display offset
	OLED_WR_Byte(0x00, OLED_CMD); //

	OLED_WR_Byte(0xD5, OLED_CMD); //set osc division
	OLED_WR_Byte(0x80, OLED_CMD); //

	OLED_WR_Byte(0xD8, OLED_CMD); //set area color mode off
	OLED_WR_Byte(0x05, OLED_CMD); //

	OLED_WR_Byte(0xD9, OLED_CMD); //Set Pre-Charge Period
	OLED_WR_Byte(0xF1, OLED_CMD); //

	OLED_WR_Byte(0xDA, OLED_CMD); //set com pin configuartion
	OLED_WR_Byte(0x12, OLED_CMD); //

	OLED_WR_Byte(0x30, OLED_CMD); //

	OLED_WR_Byte(0x8D, OLED_CMD); //set charge pump enable
	OLED_WR_Byte(0x14, OLED_CMD); //

	OLED_WR_Byte(0xAF, OLED_CMD); //--turn on oled panel
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

//void CODE_SECTION("ramfuncs")  //有无没区别
void INTERRUPT timer0_isr() {
	IntCount++;
	PieCtrlRegs.PIEACK.all = PIEACK_GROUP1;
}

void delay(u32 ms) {
	u32 start = IntCount;
	while (IntCount - start < ms)
		;
}
void OLED_SCLK_Clr() {
	GpioDataRegs.GPACLEAR.bit.GPIO18 = 1;
}

void OLED_SCLK_Set(){
GpioDataRegs.GPATOGGLE.bit.GPIO18 = 1;}

void OLED_SDIN_Clr()  {
	GpioDataRegs.GPACLEAR.bit.GPIO16 = 1;}
void OLED_SDIN_Set() {
	GpioDataRegs.GPACLEAR.bit.GPIO16 = 1;
}




int main(void)
{

    //InitFlash();
    InitSysCtrl();  //Initializes the System Control registers to a known state.
    InitTimer();
    OLED_Init();
    delay(1000);
    OLED_On();
    while(1){
    }

	return 0;
}

// ----------------------------------------------------------------------------

```

> 可以复制，看看运行如何
