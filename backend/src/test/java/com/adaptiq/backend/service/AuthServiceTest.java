package com.adaptiq.backend.service;

import com.adaptiq.backend.dto.AuthDtos.*;
import com.adaptiq.backend.model.User;
import com.adaptiq.backend.repository.UserRepository;
import com.adaptiq.backend.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private RestTemplate restTemplate;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtUtil, restTemplate);
    }

    @Test
    void testRegisterSuccess() {
        RegisterRequest request = new RegisterRequest("Alex Morgan", "alex@example.com", "password123");

        when(userRepository.existsByEmail("alex@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed_password123");
        when(jwtUtil.generateToken("alex@example.com")).thenReturn("mock-jwt-token");

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("mock-jwt-token", response.token());
        assertEquals("Alex Morgan", response.name());
        assertEquals("alex@example.com", response.email());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertEquals("Alex Morgan", savedUser.getName());
        assertEquals("alex@example.com", savedUser.getEmail());
        assertEquals("hashed_password123", savedUser.getPasswordHash());
        assertEquals("LOCAL", savedUser.getAuthProvider());
    }

    @Test
    void testRegisterDuplicateEmail() {
        RegisterRequest request = new RegisterRequest("Alex Morgan", "alex@example.com", "password123");
        when(userRepository.existsByEmail("alex@example.com")).thenReturn(true);

        assertThrows(ResponseStatusException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void testLoginSuccess() {
        LoginRequest request = new LoginRequest("alex@example.com", "password123");
        User user = new User();
        user.setEmail("alex@example.com");
        user.setName("Alex Morgan");
        user.setPasswordHash("hashed_password123");

        when(userRepository.findByEmail("alex@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashed_password123")).thenReturn(true);
        when(jwtUtil.generateToken("alex@example.com")).thenReturn("mock-jwt-token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mock-jwt-token", response.token());
        assertEquals("Alex Morgan", response.name());
    }

    @Test
    void testLoginBadPassword() {
        LoginRequest request = new LoginRequest("alex@example.com", "wrongpassword");
        User user = new User();
        user.setEmail("alex@example.com");
        user.setPasswordHash("hashed_password123");

        when(userRepository.findByEmail("alex@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongpassword", "hashed_password123")).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> authService.login(request));
    }

    @Test
    void testForgotPasswordSuccess() {
        ForgotPasswordRequest request = new ForgotPasswordRequest("alex@example.com");
        User user = new User();
        user.setEmail("alex@example.com");

        when(userRepository.findByEmail("alex@example.com")).thenReturn(Optional.of(user));

        ForgotPasswordResponse response = authService.forgotPassword(request);

        assertNotNull(response);
        assertNotNull(response.resetToken());
        assertEquals(6, response.resetToken().length());
        assertEquals("alex@example.com", response.email());

        verify(userRepository).save(user);
        assertNotNull(user.getResetToken());
        assertNotNull(user.getResetTokenExpiry());
        assertTrue(user.getResetTokenExpiry().isAfter(LocalDateTime.now()));
    }

    @Test
    void testForgotPasswordUserNotFound() {
        ForgotPasswordRequest request = new ForgotPasswordRequest("unknown@example.com");
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> authService.forgotPassword(request));
    }

    @Test
    void testResetPasswordSuccess() {
        ResetPasswordRequest request = new ResetPasswordRequest("alex@example.com", "123456", "newSecurePassword");
        User user = new User();
        user.setEmail("alex@example.com");
        user.setName("Alex Morgan");
        user.setResetToken("123456");
        user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(10));

        when(userRepository.findByEmail("alex@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("newSecurePassword")).thenReturn("hashed_new_password");
        when(jwtUtil.generateToken("alex@example.com")).thenReturn("new-jwt-token");

        AuthResponse response = authService.resetPassword(request);

        assertNotNull(response);
        assertEquals("new-jwt-token", response.token());
        assertEquals("Alex Morgan", response.name());

        verify(userRepository).save(user);
        assertEquals("hashed_new_password", user.getPasswordHash());
        assertNull(user.getResetToken());
        assertNull(user.getResetTokenExpiry());
    }

    @Test
    void testResetPasswordInvalidToken() {
        ResetPasswordRequest request = new ResetPasswordRequest("alex@example.com", "wrong_code", "newPassword");
        User user = new User();
        user.setEmail("alex@example.com");
        user.setResetToken("123456");
        user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(10));

        when(userRepository.findByEmail("alex@example.com")).thenReturn(Optional.of(user));

        assertThrows(ResponseStatusException.class, () -> authService.resetPassword(request));
    }

    @Test
    void testResetPasswordExpiredToken() {
        ResetPasswordRequest request = new ResetPasswordRequest("alex@example.com", "123456", "newPassword");
        User user = new User();
        user.setEmail("alex@example.com");
        user.setResetToken("123456");
        user.setResetTokenExpiry(LocalDateTime.now().minusMinutes(5));

        when(userRepository.findByEmail("alex@example.com")).thenReturn(Optional.of(user));

        assertThrows(ResponseStatusException.class, () -> authService.resetPassword(request));
    }

    @Test
    void testOAuthLoginNewGoogleUser() {
        OAuthLoginRequest request = new OAuthLoginRequest(
                "google",
                null,
                null,
                "candidate.google@adaptiq.ai",
                "Google Candidate",
                null
        );

        when(userRepository.findByEmail("candidate.google@adaptiq.ai")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_random_uuid");
        when(jwtUtil.generateToken("candidate.google@adaptiq.ai")).thenReturn("oauth-jwt-token");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthResponse response = authService.oauthLogin("google", request);

        assertNotNull(response);
        assertEquals("oauth-jwt-token", response.token());
        assertEquals("candidate.google@adaptiq.ai", response.email());
        assertEquals("Google Candidate", response.name());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertEquals("GOOGLE", saved.getAuthProvider());
        assertEquals("hashed_random_uuid", saved.getPasswordHash());
    }

    @Test
    void testOAuthLoginExistingGitHubUser() {
        OAuthLoginRequest request = new OAuthLoginRequest(
                "github",
                null,
                null,
                "dev@github.com",
                "GitHub Dev",
                null
        );

        User existingUser = new User();
        existingUser.setEmail("dev@github.com");
        existingUser.setName("GitHub Dev");
        existingUser.setPasswordHash("existing_hash");
        existingUser.setAuthProvider("LOCAL");

        when(userRepository.findByEmail("dev@github.com")).thenReturn(Optional.of(existingUser));
        when(jwtUtil.generateToken("dev@github.com")).thenReturn("github-jwt-token");

        AuthResponse response = authService.oauthLogin("github", request);

        assertNotNull(response);
        assertEquals("github-jwt-token", response.token());
        assertEquals("GITHUB", existingUser.getAuthProvider());
        verify(userRepository).save(existingUser);
    }
}
