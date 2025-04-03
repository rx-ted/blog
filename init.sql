SELECT count(1)
FROM
    t_user_auth ua
    LEFT JOIN t_user_info ui ON ua.user_info_id = ui.id