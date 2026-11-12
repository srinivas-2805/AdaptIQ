package com.adaptiq.backend.service;

import com.adaptiq.backend.dto.AiDtos.FeedbackRequest;
import com.adaptiq.backend.dto.AiDtos.FeedbackResponse;
import com.adaptiq.backend.dto.AiDtos.PrepDayPlan;
import com.adaptiq.backend.dto.AiDtos.TopicSuggestion;
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
public class FeedbackService {

    private static final Logger log = LoggerFactory.getLogger(FeedbackService.class);

    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    public FeedbackService(GeminiService geminiService) {
        this.geminiService = geminiService;
        this.objectMapper = new ObjectMapper();
    }

    public FeedbackResponse generateFeedback(FeedbackRequest request) {
        if (request.questions() == null || request.questions().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one question is required for feedback generation.");
        }

        String role = request.role() != null && !request.role().isBlank() ? request.role().trim() : "Software Engineer";
        double overallScore = request.overallScore() != null ? request.overallScore() : 7.0;

        StringBuilder qaSummary = new StringBuilder();
        int size = request.questions().size();
        for (int i = 0; i < size; i++) {
            String q = request.questions().get(i);
            String a = (request.candidateAnswers() != null && i < request.candidateAnswers().size())
                    ? request.candidateAnswers().get(i) : "No answer submitted";
            Double s = (request.individualScores() != null && i < request.individualScores().size())
                    ? request.individualScores().get(i) : null;

            qaSummary.append(String.format("Round %d:\n- Question: %s\n- Candidate Answer: %s\n- Score: %s\n\n",
                    i + 1, q, a, s != null ? (s + "/10.0") : "N/A"));
        }

        List<String> goodTopics = request.topicsWellPerformed() != null ? request.topicsWellPerformed() : List.of();
        List<String> weakTopics = request.topicsStruggled() != null ? request.topicsStruggled() : List.of();

        String systemInstruction = "You are a Principal Engineering Career Mentor and Interview Coach. "
                + "Synthesize the candidate's actual interview responses into actionable, deeply personalized technical feedback. "
                + "Ground your feedback specifically on what the candidate wrote or explained. Do not output generic boilerplate. "
                + "Return strictly valid JSON matching the requested structure.";

        String userPrompt = String.format("""
                Generate comprehensive, personalized interview feedback for a candidate targeting the role of %s:

                OVERALL SCORE: %.1f / 10.0
                TOPICS CANDIDATE PERFORMED WELL IN: %s
                TOPICS CANDIDATE STRUGGLED IN: %s

                DETAILED INTERVIEW ROUND PERFORMANCE:
                %s

                REQUIREMENTS:
                1. 'overallSummary': Concise paragraph evaluating readiness for the role based on their actual answers.
                2. 'technicalStrengths': Specific technical concepts or architectures they explained correctly.
                3. 'weakAreas': Specific gaps, missing nuances, or misconceptions evidenced in their answers.
                4. 'topicSuggestions': Array of objects with 'topic' and a clear, concrete 'suggestion'.
                5. 'recommendedTopics': Targeted list of 3-5 technologies/topics to study.
                6. 'practicalSuggestions': 3-4 actionable practice drills (e.g., system design scenarios, coding patterns).
                7. 'preparationPlan': A 5-day personalized preparation plan with day (1-5), focus, and specific actionable tasks.

                Return strictly JSON matching this structure:
                {
                  "overallSummary": "...",
                  "technicalStrengths": ["..."],
                  "weakAreas": ["..."],
                  "topicSuggestions": [
                    {"topic": "...", "suggestion": "..."}
                  ],
                  "recommendedTopics": ["..."],
                  "practicalSuggestions": ["..."],
                  "preparationPlan": [
                    {"day": 1, "focus": "...", "tasks": ["...", "..."]}
                  ]
                }
                """,
                role, overallScore,
                goodTopics.isEmpty() ? "None specified" : String.join(", ", goodTopics),
                weakTopics.isEmpty() ? "None specified" : String.join(", ", weakTopics),
                qaSummary.toString()
        );

        String jsonResponse = geminiService.generateJson(systemInstruction, userPrompt);
        return parseFeedback(jsonResponse);
    }

    private FeedbackResponse parseFeedback(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);

            String summary = root.hasNonNull("overallSummary") ? root.get("overallSummary").asText() : "Interview feedback generated.";
            List<String> strengths = parseStringList(root.get("technicalStrengths"));
            List<String> weakAreas = parseStringList(root.get("weakAreas"));
            List<String> recommendedTopics = parseStringList(root.get("recommendedTopics"));
            List<String> practicalSuggestions = parseStringList(root.get("practicalSuggestions"));

            List<TopicSuggestion> topicSuggestions = new ArrayList<>();
            if (root.has("topicSuggestions") && root.get("topicSuggestions").isArray()) {
                for (JsonNode n : root.get("topicSuggestions")) {
                    String t = n.hasNonNull("topic") ? n.get("topic").asText() : "";
                    String s = n.hasNonNull("suggestion") ? n.get("suggestion").asText() : "";
                    if (!t.isBlank() || !s.isBlank()) {
                        topicSuggestions.add(new TopicSuggestion(t, s));
                    }
                }
            }

            List<PrepDayPlan> prepPlans = new ArrayList<>();
            if (root.has("preparationPlan") && root.get("preparationPlan").isArray()) {
                int day = 1;
                for (JsonNode n : root.get("preparationPlan")) {
                    int d = n.hasNonNull("day") ? n.get("day").asInt() : day;
                    String focus = n.hasNonNull("focus") ? n.get("focus").asText() : "Day " + d + " Technical Practice";
                    List<String> tasks = parseStringList(n.get("tasks"));
                    prepPlans.add(new PrepDayPlan(d, focus, tasks));
                    day++;
                }
            }

            return new FeedbackResponse(
                    summary,
                    strengths,
                    weakAreas,
                    topicSuggestions,
                    recommendedTopics,
                    practicalSuggestions,
                    prepPlans
            );
        } catch (Exception e) {
            log.error("Failed to parse Gemini feedback JSON: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Malformed feedback from Gemini: " + e.getMessage());
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
