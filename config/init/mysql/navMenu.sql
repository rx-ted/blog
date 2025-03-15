CREATE TABLE Nav_Menus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT DEFAULT 0,
    name VARCHAR(32) NOT NULL,
    url VARCHAR(255),
    grade INT,
    sort INT
);

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
    Nav_Menus (
        parent_id,
        name,
        grade,
        sort
    )
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