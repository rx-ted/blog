package asia.rxted.blog.modules.user.config;

public enum UserRoleEnum {

    ROLE_ADMIN(0, "Admin"),
    ROLE_USER(1, "User"),
    ROLE_BUYER(2, "Buyer"),
    ROLE_SELLER(4, "Seller");

    private final Integer id;
    private final String role;

    UserRoleEnum(String role) {
        this.role = role;
        this.id = 0; // default set to 0
    }

    UserRoleEnum(Integer id, String role) {
        this.role = role;
        this.id = id;
    }

    public Integer id() {
        return this.id;
    }

    public String role() {
        return this.role;
    }

    public static UserRoleEnum fromValue(int value) {
        for (UserRoleEnum roleEnum : UserRoleEnum.values()) {
            if (roleEnum.id.equals(value)) {
                return roleEnum;
            }
        }
        throw new IllegalArgumentException("Invalid role id: " + value);
    }

}
