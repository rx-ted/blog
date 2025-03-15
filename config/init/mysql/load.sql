-- load more data.

--------------------
-- Articles
--------------------
INSERT INTO
    Articles (
        title,
        author,
        tags,
        content,
        description
    )
VALUES (
        "title1",
        "Ben",
        "tag1,tag2,tag3",
        "content11111",
        "content_description"
    );

INSERT INTO
    Articles (
        title,
        author,
        tags,
        content,
        description
    )
VALUES (
        "title111",
        "Ben111",
        "tag1,tag2111,tag3",
        "content1222",
        "content_des123"
    );

--------------------
-- Nav_Menus
--------------------
INSERT INTO
    Nav_Menus (
        parent_id,
        name,
        url,
        grade,
        sort
    )
VALUES (0, 'Index', '/index', 1, 1);

INSERT INTO
    Nav_Menus (
        parent_id,
        name,
        url,
        grade,
        sort
    )
VALUES (0, 'Tags', '/tags', 1, 2);

INSERT INTO
    Nav_Menus (
        parent_id,
        name,
        url,
        grade,
        sort
    )
VALUES (0, 'Editor', '/editor', 1, 3);

INSERT INTO
    Nav_Menus (parent_id, name, grade, sort)
VALUES (0, 'Work', 1, 4);

INSERT INTO
    Nav_Menus (
        parent_id,
        name,
        url,
        grade,
        sort
    )
VALUES (
        4,
        'PictureBed',
        'https://example.com',
        2,
        1
    );

INSERT INTO
    Nav_Menus (
        parent_id,
        name,
        url,
        grade,
        sort
    )
VALUES (
        4,
        'ChatGPT',
        'https://example.com',
        2,
        2
    );

INSERT INTO
    Nav_Menus (
        parent_id,
        name,
        url,
        grade,
        sort
    )
VALUES (0, 'About', '/about', 1, 5);

-----------------
-- Users
-----------------

INSERT INTO
    `Users` (
        username,
        email,
        password,
        phone
    )
VALUES (
        "rx",
        "1552488649@qq.com",
        "123456",
        "18812345611"
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
        "155123456@qq.com",
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
        "15512345@qq.com",
        "123456",
        "188888888123"
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
        "155445566@qq.com",
        "123456",
        "188881234"
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
        "15577777777@qq.com",
        "123456",
        "1877777777"
    );

-----------------
-----------------

-----------------
-----------------