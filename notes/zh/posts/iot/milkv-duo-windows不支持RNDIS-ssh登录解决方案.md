---
author: rx-ted
title: milkv-windows不支持RNDIS-ssh登录解决方案
date: 2023-05-20 13:15:05
description: Milk-V Duo开发板在Windows系统下不支持RNDIS-SSH登录，用户无法通过此方式进行远程登录和管理。这对于那些习惯使用SSH进行远程操作的用户来说，可能会影响开发效率和使用体验。
tag: [IOT,嵌入式,milkv]
---

# milkv-windows不支持RNDIS-ssh登录解决方案

Milk-V Duo是一款基于CV1800B芯片的超紧凑嵌入式开发平台，性能强悍，为专业人士、工业ODM厂商、AIoT爱好者、DIY爱好者和创作者提供了一个可靠、低成本和高性能的平台。  
然而，部分用户反馈在使用Milk-V Duo开发板时，发现其Windows系统下不支持RNDIS-SSH登录，给用户的使用带来了一定的不便。  
本报告将探讨该问题的原因，并提供可能的解决方案。

## ssh登陆

- 第一次ssh登陆，发现没反应
- 第二次ssh登陆，成功进去，原因就是没有导入rdins驱动

## 问题描述

Milk-V Duo开发板在Windows系统下不支持RNDIS-SSH登录，用户无法通过此方式进行远程登录和管理。这对于那些习惯使用SSH进行远程操作的用户来说，可能会影响开发效率和使用体验。

## 可能原因

问题可能是由于Windows系统对RNDIS协议的支持不完善导致的。RNDIS是一种用于在设备之间进行网络连接的协议，而SSH则是一种安全的远程登录协议。由于Windows系统的特殊性，可能存在与RNDIS协议的兼容性问题，导致SSH登录功能无法正常使用。  
<!-- ![driver-error](../doc/img/RNDIS.png) -->

## 解决方案

针对该问题，尝试以下解决方案：  
使用其他操作系统：考虑使用其他支持RNDIS协议和SSH登录的操作系统，比如Linux或MacOS。这些操作系统通常对RNDIS协议的支持更完善，能够更好地满足用户的需求。

咨询官方技术支持：如果该问题无法解决，建议看Milk-V Duo的官方技术支持团队。他们可能能够提供更具体的解决方案或者更新的固件版本，以解决该问题。  
可以访问---->[rndis-setup](https://milkv.io/docs/duo/getting-started/setup)

> 更新RNDIS驱动：Windows上本来没有安装该驱动，需要更新一下就行了。

## 结论

虽然Milk-V Duo开发板在Windows系统下不支持RNDIS-SSH登录，但用户可以通过ttl或者以太网来解决问题。Milk-V Duo作为一款强悍且多功能的开发平台，相信未来将会不断更新和改进，为用户带来更好的使用体验。
