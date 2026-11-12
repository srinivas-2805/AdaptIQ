package com.adaptiq.backend.config;

import com.google.genai.Client;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GeminiConfig {

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.model:gemini-3.5-flash}")
    private String model;

    public String getApiKey() {
        return apiKey != null ? apiKey.trim() : "";
    }

    public boolean isApiKeyConfigured() {
        return getApiKey() != null && !getApiKey().isBlank();
    }

    public String getModel() {
        return (model != null && !model.isBlank()) ? model.trim() : "gemini-3.5-flash";
    }

    public Client createClient() {
        if (!isApiKeyConfigured()) {
            throw new IllegalStateException("Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable.");
        }
        return Client.builder().apiKey(getApiKey()).build();
    }
}
