package com.adaptiq.backend.service;

import com.adaptiq.backend.dto.AiDtos.QuestionItem;
import com.adaptiq.backend.dto.AiDtos.QuestionRequest;
import com.adaptiq.backend.dto.AiDtos.QuestionResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class InterviewQuestionService {

    private static final Logger log = LoggerFactory.getLogger(InterviewQuestionService.class);

    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    public InterviewQuestionService(GeminiService geminiService) {
        this.geminiService = geminiService;
        this.objectMapper = new ObjectMapper();
    }

    public QuestionResponse generateQuestions(QuestionRequest request) {
        if (request.role() == null || request.role().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job role is required.");
        }

        int count = request.numberOfQuestions() != null ? request.numberOfQuestions() : 5;
        if (count < 1 || count > 20) {
            count = Math.max(1, Math.min(20, count));
        }

        String difficulty = request.difficulty() != null && !request.difficulty().isBlank()
                ? request.difficulty().trim() : "Intermediate";
        String experience = request.experienceLevel() != null && !request.experienceLevel().isBlank()
                ? request.experienceLevel().trim() : "Mid-Level";
        List<String> techList = request.technologies() != null && !request.technologies().isEmpty()
                ? request.technologies() : List.of("General Software Engineering");

        String systemInstruction = "You are a Principal Software Engineering Interviewer and Technical Assessor at a top-tier technology company. "
                + "Generate rigorous, highly relevant technical interview questions for the specified candidate profile. "
                + "Return strictly valid JSON with no markdown formatting or commentary outside the JSON.";

        String userPrompt = String.format("""
                Generate exactly %d technical interview questions for the following candidate profile:
                - Target Role: %s
                - Experience Level: %s
                - Target Difficulty: %s
                - Required Technologies: %s

                Requirements:
                1. Distribute questions evenly across the listed technologies.
                2. Calibrate depth to the '%s' difficulty and '%s' experience level.
                3. Avoid duplicate or trivial questions. Prioritize real-world application, architecture, concurrency, and trade-offs.
                4. For each question, supply the primary topic, difficulty level, and a concise expected answer or key evaluation points.

                Return strictly JSON matching this structure:
                {
                  "questions": [
                    {
                      "id": "q-1",
                      "question": "Clear, direct technical question...",
                      "topic": "Technology/Topic name",
                      "difficulty": "%s",
                      "expectedAnswer": "Key technical concepts, architectural principles, or trade-offs expected in an answer."
                    }
                  ]
                }
                """,
                count, request.role(), experience, difficulty, String.join(", ", techList),
                difficulty, experience, difficulty
        );

        String jsonResponse = geminiService.generateJson(systemInstruction, userPrompt);
        List<QuestionItem> items = parseQuestions(jsonResponse, difficulty, count);

        return new QuestionResponse(request.role(), difficulty, items.size(), items);
    }

    private List<QuestionItem> parseQuestions(String json, String defaultDifficulty, int expectedCount) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode questionsNode = root.has("questions") ? root.get("questions") : root;

            List<QuestionItem> result = new ArrayList<>();
            if (questionsNode.isArray()) {
                int index = 1;
                for (JsonNode node : questionsNode) {
                    String id = node.hasNonNull("id") ? node.get("id").asText() : "q-" + index;
                    String text = node.hasNonNull("question") ? node.get("question").asText()
                            : (node.hasNonNull("text") ? node.get("text").asText() : "");
                    String topic = node.hasNonNull("topic") ? node.get("topic").asText() : "General";
                    String diff = node.hasNonNull("difficulty") ? node.get("difficulty").asText() : defaultDifficulty;
                    String expected = node.hasNonNull("expectedAnswer") ? node.get("expectedAnswer").asText()
                            : (node.hasNonNull("evaluationPoints") ? node.get("evaluationPoints").asText() : "");

                    if (!text.isBlank()) {
                        result.add(new QuestionItem(id, text, topic, diff, expected));
                        index++;
                    }
                }
            }

            if (result.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to parse questions from Gemini response.");
            }
            return result;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse Gemini question JSON: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Malformed response from Gemini: " + e.getMessage());
        }
    }
}
