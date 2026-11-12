package com.adaptiq.backend.service;

import com.adaptiq.backend.config.GeminiConfig;
import com.google.genai.Client;
import com.google.genai.errors.ApiException;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    private final GeminiConfig geminiConfig;

    public GeminiService(GeminiConfig geminiConfig) {
        this.geminiConfig = geminiConfig;
    }

    public boolean isConfigured() {
        return geminiConfig.isApiKeyConfigured();
    }

    public String generateJson(String systemInstruction, String userPrompt) {
        if (!geminiConfig.isApiKeyConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable in your backend environment.");
        }

        List<String> candidateModels = new ArrayList<>();
        if (geminiConfig.getModel() != null && !geminiConfig.getModel().isBlank()) {
            candidateModels.add(geminiConfig.getModel());
        }
        for (String m : List.of("gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3-flash-preview")) {
            if (!candidateModels.contains(m)) {
                candidateModels.add(m);
            }
        }

        ApiException lastApiException = null;
        for (String modelName : candidateModels) {
            try (Client client = geminiConfig.createClient()) {
                GenerateContentConfig.Builder configBuilder = GenerateContentConfig.builder()
                        .responseMimeType("application/json")
                        .temperature(0.2f);
                if (systemInstruction != null && !systemInstruction.isBlank()) {
                    configBuilder.systemInstruction(Content.fromParts(Part.fromText(systemInstruction)));
                }

                GenerateContentResponse response = client.models.generateContent(
                        modelName,
                        userPrompt,
                        configBuilder.build()
                );

                String text = response.text();
                if (text == null || text.isBlank()) {
                    throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gemini returned an empty response.");
                }
                return cleanJsonResponse(text);
            } catch (ApiException e) {
                lastApiException = e;
                if (e.code() == 404 || e.code() == 503) {
                    log.warn("Gemini model {} returned HTTP {} ({}), trying fallback...", modelName, e.code(), e.message());
                    continue;
                }
                if (e.code() == 429) {
                    throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                            "Gemini API rate limit exceeded. Please wait a moment and try again.");
                }
                if (e.code() == 401 || e.code() == 403) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                            "Gemini API key is invalid or unauthorized.");
                }
                log.error("Gemini API error (HTTP {}): {}", e.code(), e.message());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gemini API error: " + e.message());
            } catch (IllegalStateException e) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage());
            } catch (Exception e) {
                log.error("Unexpected error invoking Gemini AI: {}", e.getMessage());
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to communicate with Gemini AI: " + e.getMessage());
            }
        }

        if (lastApiException != null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gemini API error: " + lastApiException.message());
        }
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to generate content with Gemini AI.");
    }

    public String cleanJsonResponse(String raw) {
        if (raw == null) return "{}";
        String cleaned = raw.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }
}
