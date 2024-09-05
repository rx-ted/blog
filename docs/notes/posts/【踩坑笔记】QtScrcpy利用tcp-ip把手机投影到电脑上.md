---
title: 【踩坑笔记】QtScrcpy利用tcp_ip把手机投影到电脑上
date: 2023-02-16 21:38:55
tags: 踩坑笔记
author: rx-ted
excerpt: 利用tcp/ip把手机投影到电脑上，不需要数据线连接，利用同一个局限网，实现无线连接。
---



# 目的：
利用tcp/ip把手机投影到电脑上，不需要数据线连接，利用同一个局限网，实现无线连接。
我找了很多资料，还是选择QtScrcpy。
其中原因有三：
- 第一，学习值得学的内容；
- 第二，如何编译使用，遇到困难如何解决；
- 第三，作为笔记。

QtScrcpy可以通过USB(或通过TCP/IP)连接Android设备，并进行显示和控制。不需要root权限。  
同时支持GNU/Linux，Windows和MacOS三大主流桌面平台。

具体内容，就不再描述了，传送门：[中文](https://github.com/barry-ran/QtScrcpy/blob/dev/README_zh.md) [英文](https://github.com/barry-ran/QtScrcpy/blob/dev/README.md)

接下来，如何下载、如何编译、如何使用。


---

# 准备
准备什么，首先阅读作者的README.md,其中有说明安装过程，[传送](https://github.com/barry-ran/QtScrcpy/blob/dev/README.md#build)
```
Build
All the dependencies are provided and it is easy to compile.
PC client
1. Set up the Qt development environment on the target platform. Qt version>=5.12 (use MSVC 2019 on Windows)
2. Clone the project
3. Open the project root directory all.pro or CMakeLists.txt with QtCreator
4. Compile and run
```
上面描述，我们需要下载一些必备的依赖软件。
- cmake >=3.19
- Qt >= 5.12
-  MSVC 2019 及其以上 或者 MingW (我版本是:4.3.5)
- 	Visual Studio 或者 make

缺了一个，那就不行了。至于如何安装，就不讲了。

# 下载
下载方式很多，能下载就OK。
我选择git克隆方法，于是打开**poewrshell**这个命令行。
如下代码：
> 按照我步骤去做，总算没错吧。
```powershell
cd d:\
mkdir tools
cd tools
git clone https://github.com/barry-ran/QtScrcpy.git
cd QtScrcpy\QtScrcpy
mkdir build 
cd build
```
目前位置：d:\tools\QtScrcpy\QtScrcpy\build
命令输出结果：
```powershell

PS D:\> cd tools
PS D:\tools> git clone https://github.com/barry-ran/QtScrcpy.git
Cloning into 'QtScrcpy'...
remote: Enumerating objects: 5363, done.
remote: Counting objects: 100% (579/579), done.
remote: Compressing objects: 100% (291/291), done.
remote: Total 5363 (delta 299), reused 460 (delta 273), pack-reused 4784Receiving objects: 100% (5363/5363), 403.14 MiB Receiving objects: 100% (5363/5363), 403.24 MiB | xx.00 MiB/s, done.

Resolving deltas: 100% (3501/3501), done.
Updating files: 100% (374/374), done.
PS D:\tools> cd .\QtScrcpy\QtScrcpy\
PS D:\tools\QtScrcpy\QtScrcpy> mkdir build
PS D:\tools\QtScrcpy\QtScrcpy> cd build
PS D:\tools\QtScrcpy\QtScrcpy\build>
```
提示：下载过程中数据不时出现断开网络或者没反应的情况，换个方式下载吧。

# 编译
编译时首先检查QT_DIR环境变量是否存在，若没有则设置
![在这里插入图片描述](https://img-blog.csdnimg.cn/4a6846812352496ba7fad8e77964bf86.png)
如下代码:
```powershell
 cmake -G "MinGW Makefiles" ..
 # 选择MingW编译器，利用cmake编译一下.
```
结果输出如下:
```powershell
PS D:\tools\QtScrcpy\QtScrcpy\build> cmake -G "MinGW Makefiles" ..
-- The CXX compiler identification is GNU 8.1.0
-- Detecting CXX compiler ABI info
-- Detecting CXX compiler ABI info - done
-- Check for working CXX compiler: D:/XXXX/mingw/bin/g++.exe - skipped
-- Detecting CXX compile features
-- Detecting CXX compile features - done
-- [QtScrcpy] Project QtScrcpy 0.0.0
-- [QtScrcpy] CPU_ARCH:x64
-- [QtScrcpy] BUILD_TYPE:RelWithDebInfo
-- [QtScrcpy] C++ compiler ID is: GNU
-- [QtScrcpy] Set warnings as error
-- [QtScrcpy] Qt version is: 5.12
-- multi config:QC_IS_MUTIL_CONFIG
-- Configuring done
-- Generating done
-- Build files have been written to: D:/tools/QtScrcpy/QtScrcpy/build
PS D:\tools\QtScrcpy\QtScrcpy\build>
```
这时候在D:\tools\QtScrcpy\QtScrcpy\build上出现几个文件，其中Makefile文件，则表示可以用make命令,如下代码:
```powershell
make
```
make命令后会发现有些问题，错误结果是：
```powershell
PS D:\tools\QtScrcpy\QtScrcpy\build> make
[  2%] Automatic MOC and UIC for target QtScrcpy
[  2%] Built target QtScrcpy_autogen
[  4%] Automatic RCC for res/res.qrc
Scanning dependencies of target QtScrcpy
[  7%] Building CXX object CMakeFiles/QtScrcpy.dir/QtScrcpy_autogen/mocs_compilation.cpp.obj
[  9%] Building CXX object CMakeFiles/QtScrcpy.dir/adb/adbprocess.cpp.obj
[ 12%] Building CXX object CMakeFiles/QtScrcpy.dir/device/device.cpp.obj
[ 14%] Building CXX object CMakeFiles/QtScrcpy.dir/device/controller/controller.cpp.obj
[ 17%] Building CXX object CMakeFiles/QtScrcpy.dir/device/controller/inputconvert/inputconvertbase.cpp.obj
[ 19%] Building CXX object CMakeFiles/QtScrcpy.dir/device/controller/inputconvert/inputconvertnormal.cpp.obj
[ 21%] Building CXX object CMakeFiles/QtScrcpy.dir/device/controller/inputconvert/inputconvertgame.cpp.obj
[ 24%] Building CXX object CMakeFiles/QtScrcpy.dir/device/controller/inputconvert/controlmsg.cpp.obj
[ 26%] Building CXX object CMakeFiles/QtScrcpy.dir/device/controller/inputconvert/keymap/keymap.cpp.obj
[ 29%] Building CXX object CMakeFiles/QtScrcpy.dir/device/controller/receiver/devicemsg.cpp.obj
[ 31%] Building CXX object CMakeFiles/QtScrcpy.dir/device/controller/receiver/receiver.cpp.obj
[ 34%] Building CXX object CMakeFiles/QtScrcpy.dir/device/decoder/avframeconvert.cpp.obj
[ 36%] Building CXX object CMakeFiles/QtScrcpy.dir/device/decoder/decoder.cpp.obj
[ 39%] Building CXX object CMakeFiles/QtScrcpy.dir/device/decoder/fpscounter.cpp.obj
[ 41%] Building CXX object CMakeFiles/QtScrcpy.dir/device/decoder/videobuffer.cpp.obj
[ 43%] Building CXX object CMakeFiles/QtScrcpy.dir/device/filehandler/filehandler.cpp.obj
[ 46%] Building CXX object CMakeFiles/QtScrcpy.dir/device/recorder/recorder.cpp.obj
[ 48%] Building CXX object CMakeFiles/QtScrcpy.dir/device/render/qyuvopenglwidget.cpp.obj
[ 51%] Building CXX object CMakeFiles/QtScrcpy.dir/device/server/server.cpp.obj
[ 53%] Building CXX object CMakeFiles/QtScrcpy.dir/device/server/tcpserver.cpp.obj
[ 56%] Building CXX object CMakeFiles/QtScrcpy.dir/device/server/videosocket.cpp.obj
[ 58%] Building CXX object CMakeFiles/QtScrcpy.dir/device/stream/stream.cpp.obj
[ 60%] Building CXX object CMakeFiles/QtScrcpy.dir/device/ui/toolform.cpp.obj
[ 63%] Building CXX object CMakeFiles/QtScrcpy.dir/device/ui/videoform.cpp.obj
[ 65%] Building CXX object CMakeFiles/QtScrcpy.dir/devicemanage/devicemanage.cpp.obj
[ 68%] Building CXX object CMakeFiles/QtScrcpy.dir/fontawesome/iconhelper.cpp.obj
[ 70%] Building CXX object CMakeFiles/QtScrcpy.dir/uibase/keepratiowidget.cpp.obj
[ 73%] Building CXX object CMakeFiles/QtScrcpy.dir/uibase/magneticwidget.cpp.obj
[ 75%] Building CXX object CMakeFiles/QtScrcpy.dir/util/config.cpp.obj
[ 78%] Building CXX object CMakeFiles/QtScrcpy.dir/util/bufferutil.cpp.obj
[ 80%] Building CXX object CMakeFiles/QtScrcpy.dir/util/mousetap/mousetap.cpp.obj
[ 82%] Building CXX object CMakeFiles/QtScrcpy.dir/util/mousetap/winmousetap.cpp.obj
[ 85%] Building CXX object CMakeFiles/QtScrcpy.dir/main.cpp.obj
[ 87%] Building CXX object CMakeFiles/QtScrcpy.dir/dialog.cpp.obj
[ 90%] Building RC object CMakeFiles/QtScrcpy.dir/res/QtScrcpy.rc.obj
D:\tools\QtScrcpy\QtScrcpy\res\QtScrcpy.rc:1:10: fatal error: winres.h: No such file or directory
 #include "winres.h"
          ^~~~~~~~~~
compilation terminated.
D:\workers\mingw\bin\windres.exe: preprocessing failed.
make[2]: *** [CMakeFiles\QtScrcpy.dir\build.make:623: CMakeFiles/QtScrcpy.dir/res/QtScrcpy.rc.obj] Error 1
make[1]: *** [CMakeFiles\Makefile2:83: CMakeFiles/QtScrcpy.dir/all] Error 2
make: *** [makefile:90: all] Error 2
PS D:\tools\QtScrcpy\QtScrcpy\build>
```
请移步看下**错误1**的原因分析和解决方案。


---


做好了，接下来，如下命令:
```powershell
make
```
输出结果如下:
```powershell
PS D:\tools\QtScrcpy\QtScrcpy\build> make
[  2%] Automatic MOC and UIC for target QtScrcpy
[  2%] Built target QtScrcpy_autogen
[  4%] Building RC object CMakeFiles/QtScrcpy.dir/res/QtScrcpy.rc.obj
D:\workers\mingw\bin\windres.exe: D:\\tools\\QtScrcpy\\QtScrcpy\\res\\QtScrcpy.rc:25: syntax error
make[2]: *** [CMakeFiles\QtScrcpy.dir\build.make:623: CMakeFiles/QtScrcpy.dir/res/QtScrcpy.rc.obj] Error 1
make[1]: *** [CMakeFiles\Makefile2:83: CMakeFiles/QtScrcpy.dir/all] Error 2
make: *** [makefile:90: all] Error 2
PS D:\tools\QtScrcpy\QtScrcpy\build>
```
请移步看下**错误2**的原因分析和解决方案。

----

做好了，接下来，如下命令:
```powershell
make
```
输出结果如下:
```powershell
PS D:\tools\QtScrcpy\QtScrcpy\build> make
[  2%] Automatic MOC and UIC for target QtScrcpy
[  2%] Built target QtScrcpy_autogen
Scanning dependencies of target QtScrcpy
[  4%] Building RC object CMakeFiles/QtScrcpy.dir/res/QtScrcpy.rc.obj
D:\tools\QtScrcpy\QtScrcpy\res\QtScrcpy.rc:5: warning: "VERSION_RC_STR" redefined
 #define VERSION_RC_STR "rx-ted"

<command-line>: note: this is the location of the previous definition
[  7%] Building CXX object CMakeFiles/QtScrcpy.dir/QtScrcpy_autogen/PNK5WDWK6L/qrc_res.cpp.obj
[  9%] Linking CXX executable D:\tools\QtScrcpy\output\x64\RelWithDebInfo\QtScrcpy.exe
[100%] Built target QtScrcpy
```
意味着成功了，定位到 D:\tools\QtScrcpy\output\x64\RelWithDebInfo这个文件夹，并打开这个程序，是否运行成功。
如下截图：

![在这里插入图片描述](https://img-blog.csdnimg.cn/d9761453f90842fcaa1f326528d7d77f.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA54eD5aSP,size_20,color_FFFFFF,t_70,g_se,x_16)

上面如何下载，编译，使用，我就讲完了。 不管遇到问题，学会思考，为什么会出现错误，尝试能不能独立解决这个问题，并总结一下，若时间允许的话，可以记笔记。


---

# 原因分析：
## 错误1
```
D:\tools\QtScrcpy\QtScrcpy\res\QtScrcpy.rc:1:10: fatal error: winres.h: No such file or directory
 #include "winres.h"
          ^~~~~~~~~~
compilation terminated.
D:\workers\mingw\bin\windres.exe: preprocessing failed.
make[2]: *** [CMakeFiles\QtScrcpy.dir\build.make:623: CMakeFiles/QtScrcpy.dir/res/QtScrcpy.rc.obj] Error 1
make[1]: *** [CMakeFiles\Makefile2:83: CMakeFiles/QtScrcpy.dir/all] Error 2
make: *** [makefile:90: all] Error 2
```
这个错误告诉我winres.h没有这个库，只要找到winres.h源代码，然后导入库，就行了。

## 错误2
```
PS D:\tools\QtScrcpy\QtScrcpy\build> make
[  2%] Automatic MOC and UIC for target QtScrcpy
[  2%] Built target QtScrcpy_autogen
[  4%] Building RC object CMakeFiles/QtScrcpy.dir/res/QtScrcpy.rc.obj
D:\workers\mingw\bin\windres.exe: D:\\tools\\QtScrcpy\\QtScrcpy\\res\\QtScrcpy.rc:25: syntax error
make[2]: *** [CMakeFiles\QtScrcpy.dir\build.make:623: CMakeFiles/QtScrcpy.dir/res/QtScrcpy.rc.obj] Error 1
make[1]: *** [CMakeFiles\Makefile2:83: CMakeFiles/QtScrcpy.dir/all] Error 2
make: *** [makefile:90: all] Error 2
```
这个是语法错误，要么注释，要么修改winres.h源代码。

---

# 解决方案：
## 解决错误1
D:\tools\QtScrcpy\QtScrcpy\res\QtScrcpy.rc:1:10到这行就错了，说明附近没有winres.h,那么我们只要在D:\tools\QtScrcpy\QtScrcpy\res上新建winres.h就行了，如下代码:

```c
// This is a part of the Microsoft Foundation Classes C++ library.
// Copyright (C) 1992-1999 Microsoft Corporation
// All rights reserved.
//
// This source code is only intended as a supplement to the
// Microsoft Foundation Classes Reference and related
// electronic documentation provided with the library.
// See these sources for detailed information regarding the
// Microsoft Foundation Classes product.

// winres.h - Windows resource definitions
//  extracted from WINUSER.H and COMMCTRL.H

#ifdef _AFX_MINREBUILD
#pragma component(minrebuild, off)
#endif

#define VS_VERSION_INFO     1

#ifdef APSTUDIO_INVOKED
#define APSTUDIO_HIDDEN_SYMBOLS // Ignore following symbols
#endif

#ifndef WINVER
#define WINVER 0x0400   // default to Windows Version 4.0
#endif

#include <winresrc.h>

#ifdef _MAC
#define DS_WINDOWSUI    0x8000L
#endif

// operation messages sent to DLGINIT
#define LB_ADDSTRING    (WM_USER+1)
#define CB_ADDSTRING    (WM_USER+3)

#ifdef APSTUDIO_INVOKED
#undef APSTUDIO_HIDDEN_SYMBOLS
#endif

#ifdef IDC_STATIC
#undef IDC_STATIC
#endif
#define IDC_STATIC      (-1)

#ifdef _AFX_MINREBUILD
#pragma component(minrebuild, on)
#endif

```


## 解决错误2
 D:\\tools\\QtScrcpy\\QtScrcpy\\res\\QtScrcpy.rc:25: syntax error
 
>方法1

打开QtScrcpy.rc这个文件，然后注释一下。
```c
 #include "winres.h"

IDI_ICON1       ICON      "QtScrcpy.ico"
// GB2312编码的话，在中文系统上打包FileDescription可以显示中文
// 在github action（英文系统）打包后FileDescription是乱码，utf8编码也不行。。
VS_VERSION_INFO VERSIONINFO
 FILEVERSION VERSION_MAJOR,VERSION_MINOR,VERSION_PATCH
 PRODUCTVERSION VERSION_MAJOR,VERSION_MINOR,VERSION_PATCH
 FILEFLAGSMASK 0x3fL
#ifdef _DEBUG
 FILEFLAGS 0x1L
#else
 FILEFLAGS 0x0L
#endif
 FILEOS 0x40004L
 FILETYPE 0x1L
 FILESUBTYPE 0x0L
BEGIN
    BLOCK "StringFileInfo"
    BEGIN
        BLOCK "080404b0"
        BEGIN
            VALUE "CompanyName", "RanKun"
            VALUE "FileDescription", "Android real-time display control software"
            // VALUE "FileVersion", VERSION_RC_STR
            VALUE "LegalCopyright", "Copyright (C) RanKun 2018-2038. All rights reserved."
            VALUE "ProductName", "QtScrcpy"
            // VALUE "ProductVersion", VERSION_RC_STR
        END
    END
    BLOCK "VarFileInfo"
    BEGIN
        VALUE "Translation", 0x804, 1200
    END
END
```

>方法2

知道VERSION_RC_STR没有被定义，我们只要重新定义就行了。
打开QtScrcpy.rc这个文件，然后修改一下。

```c
#include "winres.h"



#define VERSION_RC_STR "rx-ted"

IDI_ICON1       ICON      "QtScrcpy.ico"
// GB2312编码的话，在中文系统上打包FileDescription可以显示中文
// 在github action（英文系统）打包后FileDescription是乱码，utf8编码也不行。。
VS_VERSION_INFO VERSIONINFO
 FILEVERSION VERSION_MAJOR,VERSION_MINOR,VERSION_PATCH
 PRODUCTVERSION VERSION_MAJOR,VERSION_MINOR,VERSION_PATCH
 FILEFLAGSMASK 0x3fL
#ifdef _DEBUG
 FILEFLAGS 0x1L
#else
 FILEFLAGS 0x0L
#endif
 FILEOS 0x40004L
 FILETYPE 0x1L
 FILESUBTYPE 0x0L
BEGIN
    BLOCK "StringFileInfo"
    BEGIN
        BLOCK "080404b0"
        BEGIN
            VALUE "CompanyName", "RanKun"
            VALUE "FileDescription", "Android real-time display control software"
            VALUE "FileVersion", VERSION_RC_STR
            VALUE "LegalCopyright", "Copyright (C) RanKun 2018-2038. All rights reserved."
            VALUE "ProductName", "QtScrcpy"
            VALUE "ProductVersion", VERSION_RC_STR
        END
    END
    BLOCK "VarFileInfo"
    BEGIN
        VALUE "Translation", 0x804, 1200
    END
END
```


---
