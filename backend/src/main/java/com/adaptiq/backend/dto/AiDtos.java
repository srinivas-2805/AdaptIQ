package com.adaptiq.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public class AiDtos {

    // --- Feature 1: AI Question Generation ---
    public record QuestionRequest(
            @NotBlank(message = "Job role is required")
            String role,

            List<String> technologies,

            String experienceLevel,

            String difficulty,

            @Min(value = 1, message = "numberOfQuestions must be at least 1")
            @Max(value = 20, message = "numberOfQuestions cannot exceed 20")
            Integer numberOfQuestions
    ) {}

    public record QuestionItem(
            String id,
            String question,
            String topic,
            String difficulty,
            String expectedAnswer
    ) {}

    public record QuestionResponse(
            String role,
            String difficulty,
            int count,
            List<QuestionItem> questions
    ) {}

    // --- Feature 2: Answer Evaluation ---
    public record AnswerEvaluationRequest(
            @NotBlank(message = "Question is required")
            String question,

            String expectedAnswer,

            @NotBlank(message = "Candidate answer is required")
            String candidateAnswer,

            String role,

            String difficulty
    ) {}

    public record AnswerEvaluationResponse(
            Double score,
            String correctness,
            String technicalAccuracy,
            List<String> missingConcepts,
            List<String> strengths,
            List<String> areasForImprovement,
            String suggestedImprovedAnswer
    ) {}

    // --- Feature 3: Personalized Feedback Generation ---
    public record FeedbackRequest(
            String role,
            List<String> questions,
            List<String> candidateAnswers,
            List<Double> individualScores,
            Double overallScore,
            List<String> topicsWellPerformed,
            List<String> topicsStruggled
    ) {}

    public record TopicSuggestion(
            String topic,
            String suggestion
    ) {}

    public record PrepDayPlan(
            int day,
            String focus,
            List<String> tasks
    ) {}

    public record FeedbackResponse(
            String overallSummary,
            List<String> technicalStrengths,
            List<String> weakAreas,
            List<TopicSuggestion> topicSuggestions,
            List<String> recommendedTopics,
            List<String> practicalSuggestions,
            List<PrepDayPlan> preparationPlan
    ) {}

    // --- Feature 4: Resume-Based Interview Question Generation ---
    public record ResumeQuestionResponse(
            String candidateName,
            List<String> extractedSkills,
            List<String> extractedProjects,
            List<String> extractedExperience,
            List<QuestionItem> questions
    ) {}
}
