CREATE TABLE Articles (
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