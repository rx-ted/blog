drop TABLE if EXISTS `Users`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `Users` (
    `id` bigint AUTO_INCREMENT NOT NULL COMMENT 'ID',
    `create_by` varchar(255) NULL DEFAULT 'admin' COMMENT '创建者',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `delete_flag` bit(1) NULL DEFAULT NULL COMMENT '删除标志 true/false 删除/未删除',
    `update_by` varchar(255) NULL DEFAULT 'admin' COMMENT '更新者',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `avatar` varchar(1000) NULL DEFAULT NULL COMMENT '用户头像',
    `description` varchar(255) NULL DEFAULT NULL COMMENT '备注',
    `email` varchar(255) NULL DEFAULT NULL COMMENT '邮件',
    `is_super` bit(1) NULL DEFAULT NULL COMMENT '是否是超级管理员 超级管理员/普通管理员',
    `phone` varchar(255) NULL DEFAULT NULL COMMENT '手机号码',
    `nick_name` varchar(255) NULL DEFAULT NULL COMMENT '昵称',
    `password` varchar(255) NULL DEFAULT NULL COMMENT '密码',
    `sex` varchar(255) NULL DEFAULT NULL,
    `status` bit(1) NULL DEFAULT NULL COMMENT '状态 默认true正常 false禁用',
    `username` varchar(200) NOT NULL COMMENT '用户名',
    `role` INT NULL DEFAULT NULL COMMENT '角色ID',
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE INDEX `UK_sh2dyl78jk1vxtlyohwr5wht9` (`username` ASC) USING BTREE
);

INSERT INTO
    `Users` (
        username,
        email,
        password,
        phone
    )
VALUES (
        "rx",
        "155@qq.com",
        "123456",
        "188888888"
    );

INSERT INTO
    `Users` (
        username,
        email,
        password,
        phone
    )
VALUES (
        "rx1",
        "155@qq.com",
        "123456",
        "188888888"
    );

INSERT INTO
    `Users` (
        username,
        email,
        password,
        phone
    )
VALUES (
        "rx2",
        "155@qq.com",
        "123456",
        "188888888"
    );

INSERT INTO
    `Users` (
        username,
        email,
        password,
        phone
    )
VALUES (
        "rx3",
        "155@qq.com",
        "123456",
        "188888888"
    );

INSERT INTO
    `Users` (
        username,
        email,
        password,
        phone
    )
VALUES (
        "rx4",
        "155@qq.com",
        "123456",
        "188888888"
    );