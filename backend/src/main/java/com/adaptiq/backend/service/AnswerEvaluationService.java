package com.adaptiq.backend.service;

import com.adaptiq.backend.dto.AiDtos.AnswerEvaluationRequest;
import com.adaptiq.backend.dto.AiDtos.AnswerEvaluationResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
public class AnswerEvaluationService {

    private static final Logger log = LoggerFactory.getLogger(AnswerEvaluationService.class);

    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    public AnswerEvaluationService(GeminiService geminiService) {
        this.geminiService = geminiService;
        this.objectMapper = new ObjectMapper();
    }

    public AnswerEvaluationResponse evaluateAnswer(AnswerEvaluationRequest request) {
        if (request.question() == null || request.question().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question is required.");
        }
        if (request.candidateAnswer() == null || request.candidateAnswer().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Candidate answer is required.");
        }

        String role = request.role() != null && !request.role().isBlank() ? request.role().trim() : "Software Engineer";
        String diff = request.difficulty() != null && !request.difficulty().isBlank() ? request.difficulty().trim() : "Intermediate";
        String expected = request.expectedAnswer() != null && !request.expectedAnswer().isBlank()
                ? request.expectedAnswer().trim() : "Accurate architectural and conceptual explanation with proper trade-offs.";

        String systemInstruction = "You are an expert Technical Interview Evaluator. "
                + "Evaluate candidate answers strictly based on technical correctness, conceptual depth, and practical applicability. "
                + "Accept valid alternative terminology or phrasing. "
                + "Do not award full marks to vague, superficial, or memorized bullet points without substance. "
                + "Return strictly valid JSON with no markdown code fences or conversational text.";

        String userPrompt = String.format("""
                Evaluate the candidate's interview answer for the role of %s (%s difficulty):

                INTERVIEW QUESTION:
                %s

                EXPECTED CRITERIA / KEY POINTS:
                %s

                CANDIDATE'S SUBMITTED ANSWER:
                %s

                EVALUATION INSTRUCTIONS:
                1. Score the answer strictly on a scale of 0.0 to 10.0 (where 10.0 is exemplary, 7.0-8.5 is proficient, 5.0-6.9 is partially correct with gaps, <5.0 is largely incorrect or non-technical).
                2. Assess technical accuracy accurately; do not hallucinate technical features that don't exist.
                3. Identify specific missing concepts that a competent engineer should have included.
                4. Highlight what the candidate explained well in 'strengths'.
                5. Highlight precise, actionable gaps in 'areasForImprovement'.
                6. Provide a concise, model 'suggestedImprovedAnswer' demonstrating how a senior engineer would answer cleanly.

                Return strictly JSON matching this structure:
                {
                  "score": 8.0,
                  "correctness": "Correct",
                  "technicalAccuracy": "High accuracy explaining key mechanisms...",
                  "missingConcepts": ["Concept 1", "Concept 2"],
                  "strengths": ["Strength 1", "Strength 2"],
                  "areasForImprovement": ["Improvement point 1"],
                  "suggestedImprovedAnswer": "Comprehensive, clean senior-level answer."
                }
                """,
                role, diff, request.question(), expected, request.candidateAnswer()
        );

        String jsonResponse = geminiService.generateJson(systemInstruction, userPrompt);
        return parseEvaluation(jsonResponse);
    }

    private AnswerEvaluationResponse parseEvaluation(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);

            double score = root.hasNonNull("score") ? root.get("score").asDouble() : 7.0;
            score = Math.max(0.0, Math.min(10.0, Math.round(score * 10.0) / 10.0));

            String correctness = root.hasNonNull("correctness") ? root.get("correctness").asText() : (score >= 7.0 ? "Correct" : "Partially Correct");
            String technicalAccuracy = root.hasNonNull("technicalAccuracy") ? root.get("technicalAccuracy").asText() : "Evaluated based on technical criteria.";

            List<String> missingConcepts = parseStringList(root.get("missingConcepts"));
            List<String> strengths = parseStringList(root.get("strengths"));
            List<String> areasForImprovement = parseStringList(root.get("areasForImprovement"));
            String suggestedAnswer = root.hasNonNull("suggestedImprovedAnswer") ? root.get("suggestedImprovedAnswer").asText() : "";

            return new AnswerEvaluationResponse(
                    score,
                    correctness,
                    technicalAccuracy,
                    missingConcepts,
                    strengths,
                    areasForImprovement,
                    suggestedAnswer
            );
        } catch (Exception e) {
            log.error("Failed to parse Gemini evaluation JSON: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Malformed evaluation from Gemini: " + e.getMessage());
        }
    }

    private List<String> parseStringList(JsonNode node) {
        List<String> list = new ArrayList<>();
        if (node != null && node.isArray()) {
            for (JsonNode item : node) {
                if (item.isTextual() && !item.asText().isBlank()) {
                    list.add(item.asText());
                }
            }
        }
        return list;
    }
}
