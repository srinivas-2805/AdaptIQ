package com.adaptiq.backend.controller;

import com.adaptiq.backend.dto.AuthDtos.*;
import com.adaptiq.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/forgot-password")
    public ForgotPasswordResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return authService.forgotPassword(request);
    }

    @PostMapping("/reset-password")
    public AuthResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return authService.resetPassword(request);
    }

    @PostMapping("/oauth/{provider}")
    public AuthResponse oauthLogin(@PathVariable String provider, @RequestBody OAuthLoginRequest request) {
        return authService.oauthLogin(provider, request);
    }

    @GetMapping("/oauth/config")
    public OAuthConfigResponse getOAuthConfig() {
        return authService.getOAuthConfig();
    }
}
