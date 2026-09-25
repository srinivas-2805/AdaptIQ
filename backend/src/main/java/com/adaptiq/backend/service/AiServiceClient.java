package com.adaptiq.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Client for the AI/ML FastAPI microservice.
 */
@Service
public class AiServiceClient {

    private final RestTemplate restTemplate;
    private final String baseUrl;

    public AiServiceClient(RestTemplate restTemplate, @Value("${ai.service.url}") String baseUrl) {
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl;
    }

    private HttpEntity<Map<String, Object>> jsonBody(Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> extractSkills(String resumeText, String jdText) {
        var body = jsonBody(Map.of("resumeText", resumeText, "jdText", jdText == null ? "" : jdText));
        return restTemplate.postForObject(baseUrl + "/extract-skills", body, Map.class);
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> generateQuestions(List<String> skills, List<String> requirements, int count) {
        var body = jsonBody(Map.of("skills", skills, "requirements", requirements, "count", count));
        Map<String, Object> response = restTemplate.postForObject(baseUrl + "/generate-questions", body, Map.class);
        return (List<Map<String, Object>>) response.get("questions");
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> evaluateAnswer(String questionText, String topic, String difficulty, String answerText,
                                             Map<String, Object> audioMetrics, Map<String, Object> visionMetrics) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("questionText", questionText);
        payload.put("topic", topic);
        payload.put("difficulty", difficulty);
        payload.put("answerText", answerText);
        if (audioMetrics != null) {
            payload.put("audioMetrics", audioMetrics);
        }
        if (visionMetrics != null) {
            payload.put("visionMetrics", visionMetrics);
        }
        var body = jsonBody(payload);
        return restTemplate.postForObject(baseUrl + "/evaluate-answer", body, Map.class);
    }

    @SuppressWarnings("unchecked")
    public String generateFollowUp(String previousQuestion, String previousAnswer, String topic) {
        var body = jsonBody(Map.of(
                "previousQuestion", previousQuestion,
                "previousAnswer", previousAnswer,
                "topic", topic
        ));
        Map<String, Object> response = restTemplate.postForObject(baseUrl + "/generate-followup", body, Map.class);
        return (String) response.get("followUpQuestion");
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> skillGap(List<Map<String, Object>> qaHistory) {
        var body = jsonBody(Map.of("qaHistory", qaHistory));
        return restTemplate.postForObject(baseUrl + "/skill-gap", body, Map.class);
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> prepPlan(List<String> weakAreas, int days) {
        var body = jsonBody(Map.of("weakAreas", weakAreas, "days", days));
        Map<String, Object> response = restTemplate.postForObject(baseUrl + "/prep-plan", body, Map.class);
        return (List<Map<String, Object>>) response.get("plan");
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> transcribeAudio(byte[] fileBytes, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        ByteArrayResource resource = new ByteArrayResource(fileBytes) {
            @Override
            public String getFilename() {
                return filename != null ? filename : "audio.webm";
            }
        };
        body.add("file", resource);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
        return restTemplate.postForObject(baseUrl + "/speech/transcribe", requestEntity, Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getCodingProblems() {
        return restTemplate.getForObject(baseUrl + "/code/problems", Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> executeCode(Map<String, Object> request) {
        var body = jsonBody(request);
        return restTemplate.postForObject(baseUrl + "/code/execute", body, Map.class);
    }
}
