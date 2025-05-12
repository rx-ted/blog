package asia.rxted.blog.enums;

public enum UserRoleEnum {

    ROLE_ADMIN("Admin"),
    ROLE_USER("User"),
    ROLE_BUYER("Buyer"),
    ROLE_SELLER("Seller");

    private final String role;

    UserRoleEnum(String role) {
        this.role = role;
    }

    public String role() {
        return this.role;
    }

    public static UserRoleEnum fromRole(String role) {
        for (UserRoleEnum userRole : UserRoleEnum.values()) {
            if (userRole.role().equalsIgnoreCase(role)) {
                return userRole;
            }
        }
        throw new IllegalArgumentException("No enum constant with role " + role);
    }

}
