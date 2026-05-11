package com.example.demo.auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final AppUserRepository appUserRepository;

    public AuthService(final AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    public AuthResponse register(final AuthRequest request) {
        final String username = request.getUsername().trim();
        if (appUserRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User already exists");
        }

        final AppUser user = new AppUser();
        user.setUsername(username);
        user.setPassword(request.getPassword());
        return new AuthResponse(appUserRepository.save(user));
    }

    public AuthResponse login(final AuthRequest request) {
        final String username = request.getUsername().trim();
        final AppUser user = appUserRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Invalid credentials"
                ));

        if (!user.getPassword().equals(request.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        return new AuthResponse(user);
    }
}
