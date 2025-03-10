package asia.rxted.blog.modules.user.config;

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

}
