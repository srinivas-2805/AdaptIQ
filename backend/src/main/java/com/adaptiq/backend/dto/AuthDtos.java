package com.adaptiq.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    public record RegisterRequest(
            @NotBlank String name,
            @Email @NotBlank String email,
            @Size(min = 6, message = "Password must be at least 6 characters") String password
    ) {}

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password
    ) {}

    public record AuthResponse(String token, String name, String email) {}

    public record ForgotPasswordRequest(
            @Email @NotBlank String email
    ) {}

    public record ForgotPasswordResponse(
            String message,
            String resetToken,
            String email
    ) {}

    public record ResetPasswordRequest(
            @Email @NotBlank String email,
            @NotBlank String token,
            @Size(min = 6, message = "Password must be at least 6 characters") String newPassword
    ) {}

    public record OAuthLoginRequest(
            String provider,
            String token,
            String code,
            String email,
            String name,
            String redirectUri
    ) {}

    public record OAuthConfigResponse(
            String googleClientId,
            String githubClientId,
            boolean googleConfigured,
            boolean githubConfigured
    ) {}
}
