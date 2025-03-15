-- create tables
SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;

drop TABLE if EXISTS `Articles`;

CREATE TABLE `Articles` (
    id INT AUTO_INCREMENT NOT null PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_origin BOOLEAN DEFAULT TRUE,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(100),
    tags VARCHAR(255),
    content TEXT NOT NULL,
    description TEXT
);

drop TABLE if EXISTS `Nav_Menus`;

CREATE TABLE `Nav_Menus` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT DEFAULT 0,
    name VARCHAR(32) NOT NULL,
    url VARCHAR(255),
    grade INT,
    sort INT
);

drop TABLE if EXISTS `Users`;

CREATE TABLE `Users` (
    `id` bigint AUTO_INCREMENT NOT NULL COMMENT 'ID',
    `username` varchar(32) NOT NULL COMMENT '用户名',
    `nick_name` varchar(20) NULL DEFAULT NULL COMMENT '昵称',
    `phone` varchar(100) NULL DEFAULT NULL UNIQUE COMMENT '手机号码',
    `avatar` varchar(1000) NULL DEFAULT NULL COMMENT '用户头像',
    `email` varchar(100) NULL DEFAULT NULL UNIQUE COMMENT '邮件',
    `password` varchar(255) NULL DEFAULT NULL COMMENT '密码',
    `is_super` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否是超级管理员 超级管理员/普通管理员',
    `status` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '状态 默认true正常 false禁用',
    `role` VARCHAR(10) NOT NULL DEFAULT "ADMIN" COMMENT '角色ID',
    `description` varchar(255) NULL DEFAULT NULL COMMENT '备注',
    `sex` varchar(10) NULL DEFAULT NULL COMMENT '性别',
    `access_token` VARCHAR(255) NULL DEFAULT NULL COMMENT '访问令牌',
    `refresh_token` VARCHAR(255) NULL DEFAULT NULL COMMENT '刷新令牌',
    `create_by` varchar(255) NULL DEFAULT 'admin' COMMENT '创建者',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `delete_flag` BOOLEAN NULL DEFAULT NULL COMMENT '删除标志 true/false 删除/未删除',
    `update_by` varchar(255) NULL DEFAULT 'admin' COMMENT '更新者',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE INDEX `UK_sh2dyl78jk1vxtlyohwr5wht9` (`username` ASC) USING BTREE
);