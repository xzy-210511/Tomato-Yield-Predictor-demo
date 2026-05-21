package com.example.demo.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private static final String BCRYPT_PREFIX = "$2";

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            final AppUserRepository appUserRepository,
            final PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthResponse register(final AuthRequest request) {
        final String username = request.getUsername().trim();
        if (appUserRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User already exists");
        }

        final AppUser user = new AppUser();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        return new AuthResponse(appUserRepository.save(user));
    }

    public AuthResponse login(final AuthRequest request) {
        final String username = request.getUsername().trim();
        final AppUser user = appUserRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Invalid credentials"
                ));

        if (!passwordMatches(request.getPassword(), user)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        return new AuthResponse(user);
    }

    private boolean passwordMatches(final String rawPassword, final AppUser user) {
        final String storedPassword = user.getPassword();
        if (storedPassword != null && storedPassword.startsWith(BCRYPT_PREFIX)) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }

        if (storedPassword != null && storedPassword.equals(rawPassword)) {
            user.setPassword(passwordEncoder.encode(rawPassword));
            appUserRepository.save(user);
            return true;
        }

        return false;
    }
}
