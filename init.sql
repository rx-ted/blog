select
    re.id as id,
    url,
    request_method,
    role_name
from
    t_resource re
    left join t_role_resource rr on re.id = rr.resource_id
    left join t_role ro on rr.role_id = ro.id
    where
    re.parent_id is not null
    -- and is_anonymous = 0
;