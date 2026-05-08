package com.example.demo.auth;

public class AuthResponse {

    private Long userId;
    private String username;

    public AuthResponse(final AppUser user) {
        this.userId = user.getId();
        this.username = user.getUsername();
    }

    public Long getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }
}
