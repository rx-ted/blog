INSERT
    OR IGNORE INTO site_settings (key, value)
VALUES ('default_theme', 'editorial'),
    ('body_font', 'serif'),
    (
        'nav_links',
        '[{"label":"GitHub","url":"https://github.com/rx-ted/blog","openInNewTab":true},{"label":"Dashboard","url":"/dashboard","openInNewTab":false},{"label":"RSS","url":"/feed.xml","openInNewTab":true}]'
    );