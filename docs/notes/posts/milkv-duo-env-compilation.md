---
title: 基于milkv-duo环境编译
date: 2023-05-20 13:15:05
excerpt: Milk-V Duo是一个基于CV1800B芯片的超紧凑嵌入式开发平台。它可以运行Linux和RTOS，为专业人士、工业ODM厂商、AIoT爱好者、DIY爱好者和创作者提供了一个可靠、低成本和高性能的平台。
tags: [IOT,嵌入式]
---

# milkv-duo envronment compilation

基于milkv-duo环境编译

Milk-V Duo是一个基于CV1800B芯片的超紧凑嵌入式开发平台。它可以运行Linux和RTOS，为专业人士、工业ODM厂商、AIoT爱好者、DIY爱好者和创作者提供了一个可靠、低成本和高性能的平台。

## 安装

### 虚拟机

VBox + Ubuntu20.04
<!-- ![vBox-Ubuntu](./img/VBox+Ubuntu.png) -->

### 依赖

```bash
sudo apt install pkg-config build-essential ninja-build automake autoconf libtool wget curl git gcc libssl-dev bc slib squashfs-tools android-sdk-libsparse-utils jq python3-distutils scons parallel tree python3-dev python3-pip device-tree-compiler ssh cpio fakeroot libncurses5 flex bison libncurses5-dev genext2fs rsync unzip dosfstools mtools tclsh ssh-client android-sdk-ext4-utils
wget https://github.com/Kitware/CMake/releases/download/v3.26.4/cmake-3.26.4-linux-x86_64.sh
chmod +x cmake-3.26.4-linux-x86_64.sh
sudo sh cmake-3.26.4-linux-x86_64.sh --skip-license --prefix=/usr/local/
```

### 添加一些package

```bash
source ./build/cvisetup.sh
defconfig cv1800b_milkv_duo_sd 
menuconfig
# 可以添加或者删除一些软件和配置
```

### 编译打包

可以查看env.sh源代码  
> 说明每个平台是不一样，希望大家稍微修改哈

```bash
#!/bin/bash
MILKV_BOARD_DIR=milkv
MILKV_BOARD_ARRAY=
MILKV_BOARD=
MILKV_BOARD_CONFIG=
current_dir=$PWD;
toolchain_name[0]="riscv64-elf-x86_64"
toolchain_name[1]="riscv64-linux-x86_64"
toolchain_name[2]="riscv64-linux-musl-x86_64"
get_toolchain() {
    f1=$(find . -name ${toolchain_name[0]} )
    f2=$(find . -name ${toolchain_name[1]} )
    f3=$(find . -name ${toolchain_name[2]} )

    if [[ $f1 && $f2 && $f3 ]]; then
        echo "${toolchain_name[0]} ${toolchain_name[1]} ${toolchain_name[2]} is found." 
    else
        echo "Toolchain does not exist, download it now..."

        toolchain_url="https://sophon-file.sophon.cn/sophon-prod-s3/drive/23/03/07/16/host-tools.tar.gz"
        echo "toolchain_url: ${toolchain_url}"
        toolchain_file=${toolchain_url##*/}
        echo "toolchain_file: ${toolchain_file}"

        wget ${toolchain_url} -O ${toolchain_file}
        if [ $? -ne 0 ]; then
        echo "Failed to download ${toolchain_url} !"
        exit 1
        fi

        if [ ! -f ${toolchain_file} ]; then
        echo "${toolchain_file} not found!"
        exit 1
        fi

        echo "Extracting ${toolchain_file}..."
        tar -xf ${toolchain_file}
        if [ $? -ne 0 ]; then
        echo "Extract ${toolchain_file} failed!"
        exit 1
        fi

        [ -f ${toolchain_file} ] && rm -rf ${toolchain_file}


        IFS='.' read -ra parts <<< "$toolchain_file"
        echo "$current_dir/${parts[0]}/gcc/${toolchain_name[0]}/bin" >> env.txt
        echo "$current_dir/${parts[0]}/gcc/${toolchain_name[1]}/bin" >> env.txt
        echo "$current_dir/${parts[0]}/gcc/${toolchain_name[2]}/bin" >> env.txt
        if [ "$(source env.txt)" ]; then
            echo "source env.txt";
        fi
    fi
}
function get_available_board()
{
    cd ${MILKV_BOARD_DIR} || exit 1

  MILKV_BOARD_ARRAY=( $(ls boardconfig*.sh | sort | awk -F"[-.]" -v OFS='-' '{print $2, $3}') )
  echo "${MILKV_BOARD_ARRAY[@]}"

  if [ ${#MILKV_BOARD_ARRAY[@]} -eq 0 ]; then
    echo "No available board config"
    exit 1

  elif [ ${#MILKV_BOARD_ARRAY[@]} -eq 1 ]; then
    # Only one board
    echo "Ready to build: ${MILKV_BOARD_ARRAY[0]}"
    MILKV_BOARD=${MILKV_BOARD_ARRAY[0]}
  else
     echo "other board"
  fi
  if [ -z "${MILKV_BOARD// }" ]; then
    echo "No board specified!"
  exit 1
fi
}
get_toolchain
get_available_board 
export MILKV_BOARD="${MILKV_BOARD}"
cd "${current_dir}" || exit 1
MILKV_BOARD_CONFIG=${MILKV_BOARD_DIR}/boardconfig-${MILKV_BOARD}.sh

if [ ! -f ${MILKV_BOARD_CONFIG} ]; then
  echo "${MILKV_BOARD_CONFIG} not found!"
  exit 1
fi

source ${MILKV_BOARD_CONFIG}

source build/${MV_BUILD_ENV} > /dev/null 2>&1
defconfig ${MV_BOARD_LINK} > /dev/null 2>&1

echo "OUTPUT_DIR: ${OUTPUT_DIR}"  # @build/milkvsetup.sh

if [ $# -eq 1 ];then
 clean_all
fi
build_all
pack_sd_image
```

执行如下命令：  

```bash
# 第一次编译时候可以用
./env.sh
# 不是第一次编译时候可以用，先清理缓存
# ./env.sh arg1     arg1表示参数1，内容没固定，随便写
./env.sh 1
```

或者想在镜像添加一些文件，如python，gdb等，需要如下命令：

```bash
source ./build/cvisetup.sh
defconfig cv1800b_milkv_duo_sd
menuconfig
# 可以选择你喜欢的东西，然后可以运行
build_all
pack_sd_image
```

## image

上述步骤，正常运行编译打包，导出image镜像，如下：  
install/soc_cv1800b_milkv_duo_sd/milkv-duo.img

烧录方式可以是SD卡或者其他工具  

## 判断是否成功

测试ping 192.168.42.1  
<!-- ![rndis](../doc/img/RNDIS.png)   -->
需要安装依赖驱动哈  
<!-- ![ssh milkv](../doc/img/ssh-milkv.png) -->

## 建议

> 1. 不要安装在Windows系统下编译
> 2. 即是在Windows用wsl环境下配置，不建议
> 3. 在Linux或者容器或者虚拟机，不要直连Windows下路径，有时候莫名其妙出一些问题
> 4. 搬抄按照步骤去做，发现有一些依赖文件没安装，需要分析一下
