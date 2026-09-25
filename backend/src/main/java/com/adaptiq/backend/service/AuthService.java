package com.adaptiq.backend.service;

import com.adaptiq.backend.dto.AuthDtos.*;
import com.adaptiq.backend.model.User;
import com.adaptiq.backend.repository.UserRepository;
import com.adaptiq.backend.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RestTemplate restTemplate;

    @Value("${oauth.google.client-id:}")
    private String googleClientId;

    @Value("${oauth.google.client-secret:}")
    private String googleClientSecret;

    @Value("${oauth.github.client-id:}")
    private String githubClientId;

    @Value("${oauth.github.client-secret:}")
    private String githubClientSecret;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       RestTemplate restTemplate) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.restTemplate = restTemplate;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setAuthProvider("LOCAL");
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(token, user.getName(), user.getEmail());
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email().trim().toLowerCase())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String token = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(token, user.getName(), user.getEmail());
    }

    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
        String email = request.email().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found with this email address"));

        // Generate 6-digit verification code
        String resetCode = String.format("%06d", (int) (Math.random() * 900000) + 100000);
        user.setResetToken(resetCode);
        user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);

        return new ForgotPasswordResponse(
                "Password reset code generated. Enter this 6-digit code to reset your password.",
                resetCode,
                user.getEmail()
        );
    }

    public AuthResponse resetPassword(ResetPasswordRequest request) {
        String email = request.email().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found with this email address"));

        if (user.getResetToken() == null || !user.getResetToken().equalsIgnoreCase(request.token().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid reset code. Please check and try again.");
        }

        if (user.getResetTokenExpiry() != null && user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reset code has expired. Please request a new one.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(token, user.getName(), user.getEmail());
    }

    public AuthResponse oauthLogin(String provider, OAuthLoginRequest request) {
        String prov = provider != null ? provider.trim().toLowerCase() : "oauth";
        String email = null;
        String name = null;

        if ("google".equals(prov)) {
            // 1. Google authorization code exchange
            if (request.code() != null && !request.code().isBlank() && googleClientId != null && !googleClientId.isBlank() && googleClientSecret != null && !googleClientSecret.isBlank()) {
                try {
                    HttpHeaders tokenHeaders = new HttpHeaders();
                    tokenHeaders.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
                    MultiValueMap<String, String> tokenParams = new LinkedMultiValueMap<>();
                    tokenParams.add("code", request.code());
                    tokenParams.add("client_id", googleClientId);
                    tokenParams.add("client_secret", googleClientSecret);
                    tokenParams.add("redirect_uri", request.redirectUri() != null && !request.redirectUri().isBlank() ? request.redirectUri() : "http://localhost:5173/login");
                    tokenParams.add("grant_type", "authorization_code");

                    HttpEntity<MultiValueMap<String, String>> tokenReq = new HttpEntity<>(tokenParams, tokenHeaders);
                    ResponseEntity<Map> tokenResp = restTemplate.postForEntity("https://oauth2.googleapis.com/token", tokenReq, Map.class);
                    if (tokenResp.getBody() != null) {
                        String idToken = (String) tokenResp.getBody().get("id_token");
                        String accessToken = (String) tokenResp.getBody().get("access_token");
                        if (idToken != null) {
                            String verifyUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
                            Map<String, Object> resp = restTemplate.getForObject(verifyUrl, Map.class);
                            if (resp != null && resp.containsKey("email")) {
                                email = (String) resp.get("email");
                                name = (String) resp.get("name");
                            }
                        } else if (accessToken != null) {
                            HttpHeaders headers = new HttpHeaders();
                            headers.setBearerAuth(accessToken);
                            HttpEntity<?> entity = new HttpEntity<>(headers);
                            ResponseEntity<Map> userResp = restTemplate.exchange("https://www.googleapis.com/oauth2/v3/userinfo", HttpMethod.GET, entity, Map.class);
                            if (userResp.getBody() != null && userResp.getBody().containsKey("email")) {
                                email = (String) userResp.getBody().get("email");
                                name = (String) userResp.getBody().get("name");
                            }
                        }
                    }
                } catch (Exception e) {
                    // fall through
                }
            }

            // 2. Google direct ID token / access token verification
            if (email == null && request.token() != null && !request.token().isBlank()) {
                try {
                    String verifyUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + request.token();
                    Map<String, Object> resp = restTemplate.getForObject(verifyUrl, Map.class);
                    if (resp != null && resp.containsKey("email")) {
                        email = (String) resp.get("email");
                        name = (String) resp.get("name");
                    }
                } catch (Exception ignored) {
                    try {
                        HttpHeaders headers = new HttpHeaders();
                        headers.setBearerAuth(request.token());
                        HttpEntity<?> entity = new HttpEntity<>(headers);
                        ResponseEntity<Map> userResp = restTemplate.exchange("https://www.googleapis.com/oauth2/v3/userinfo", HttpMethod.GET, entity, Map.class);
                        if (userResp.getBody() != null && userResp.getBody().containsKey("email")) {
                            email = (String) userResp.getBody().get("email");
                            name = (String) userResp.getBody().get("name");
                        }
                    } catch (Exception ignored2) {
                    }
                }
            }

            if (email == null && (request.code() != null || request.token() != null)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google authentication failed. Please verify your Google credentials and redirect URI in Google Cloud Console.");
            }

            if (email == null) {
                email = request.email() != null && !request.email().isBlank()
                        ? request.email().trim().toLowerCase()
                        : "candidate.google@adaptiq.ai";
                name = request.name() != null && !request.name().isBlank()
                        ? request.name()
                        : "Google Candidate";
            }
        } else if ("github".equals(prov)) {
            // Check if GitHub code exchange or token verification is applicable
            if (request.code() != null && !request.code().isBlank() && githubClientId != null && !githubClientId.isBlank() && githubClientSecret != null && !githubClientSecret.isBlank()) {
                try {
                    HttpHeaders headers = new HttpHeaders();
                    headers.setAccept(List.of(MediaType.APPLICATION_JSON));
                    Map<String, String> body = new HashMap<>();
                    body.put("client_id", githubClientId);
                    body.put("client_secret", githubClientSecret);
                    body.put("code", request.code());
                    if (request.redirectUri() != null && !request.redirectUri().isBlank()) {
                        body.put("redirect_uri", request.redirectUri());
                    }

                    HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);
                    Map tokenResp = restTemplate.postForObject("https://github.com/login/oauth/access_token", entity, Map.class);
                    if (tokenResp != null && tokenResp.containsKey("access_token")) {
                        String ghToken = (String) tokenResp.get("access_token");
                        HttpHeaders userHeaders = new HttpHeaders();
                        userHeaders.setBearerAuth(ghToken);
                        userHeaders.set("User-Agent", "AdaptIQ-Backend");
                        HttpEntity<?> userEntity = new HttpEntity<>(userHeaders);
                        ResponseEntity<Map> userResp = restTemplate.exchange("https://api.github.com/user", HttpMethod.GET, userEntity, Map.class);
                        if (userResp.getBody() != null) {
                            name = (String) userResp.getBody().get("name");
                            if (name == null || name.isBlank()) name = (String) userResp.getBody().get("login");
                            email = (String) userResp.getBody().get("email");
                        }

                        // If user email is private on GitHub, fetch from /user/emails
                        if (email == null) {
                            try {
                                ResponseEntity<List> emailsResp = restTemplate.exchange(
                                        "https://api.github.com/user/emails",
                                        HttpMethod.GET,
                                        userEntity,
                                        List.class
                                );
                                if (emailsResp.getBody() != null) {
                                    for (Object item : emailsResp.getBody()) {
                                        if (item instanceof Map map) {
                                            Boolean primary = (Boolean) map.get("primary");
                                            Boolean verified = (Boolean) map.get("verified");
                                            if (Boolean.TRUE.equals(verified)) {
                                                email = (String) map.get("email");
                                                if (Boolean.TRUE.equals(primary)) {
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (Exception ignored) {
                            }
                        }
                    }
                } catch (Exception ignored) {
                }
            }

            if (email == null && request.code() != null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "GitHub authentication failed. Please verify your GitHub OAuth App credentials and callback URL.");
            }

            if (email == null) {
                email = request.email() != null && !request.email().isBlank()
                        ? request.email().trim().toLowerCase()
                        : "candidate.github@adaptiq.ai";
                name = request.name() != null && !request.name().isBlank()
                        ? request.name()
                        : "GitHub Candidate";
            }
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported OAuth provider: " + provider);
        }

        // Find or create user
        final String resolvedEmail = email.trim().toLowerCase();
        final String resolvedName = name != null && !name.isBlank() ? name : resolvedEmail.split("@")[0];

        User user = userRepository.findByEmail(resolvedEmail).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(resolvedEmail);
            newUser.setName(resolvedName);
            // Securely hash a random UUID password so it is never plaintext
            newUser.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            newUser.setAuthProvider(prov.toUpperCase());
            return userRepository.save(newUser);
        });

        // Ensure user details are saved
        if (user.getAuthProvider() == null || user.getAuthProvider().equals("LOCAL")) {
            user.setAuthProvider(prov.toUpperCase());
            userRepository.save(user);
        }

        String token = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(token, user.getName(), user.getEmail());
    }

    public OAuthConfigResponse getOAuthConfig() {
        boolean googleOk = googleClientId != null && !googleClientId.isBlank();
        boolean githubOk = githubClientId != null && !githubClientId.isBlank();
        return new OAuthConfigResponse(googleClientId, githubClientId, googleOk, githubOk);
    }
}
