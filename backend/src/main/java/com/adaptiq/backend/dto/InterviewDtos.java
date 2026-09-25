package com.adaptiq.backend.dto;

import java.util.List;
import java.util.Map;

public class InterviewDtos {

    public record StartRequest(Long resumeId, Long jobDescriptionId, Integer questionCount) {}

    public record QuestionDto(Long id, String text, String topic, String difficulty) {}

    public record StartResponse(Long sessionId, List<QuestionDto> questions) {}

    public record AudioMetricsDto(
            Integer speakingSpeedWpm,
            Integer fillerWordCount,
            Integer pauseCount,
            Integer clarityScore,
            Double durationSeconds
    ) {}

    public record VisionMetricsDto(
            Double eyeContactPercentage,
            Integer postureScore,
            String postureNote,
            Integer totalFramesAnalyzed
    ) {}

    public record SubmitAnswerRequest(
            Long questionId,
            String answerText,
            AudioMetricsDto audioMetrics,
            VisionMetricsDto visionMetrics
    ) {}

    public record EvaluationDto(
            Integer technicalKnowledge,
            Integer relevance,
            Integer communication,
            Integer clarity,
            Integer confidence,
            Integer overallScore,
            Map<String, String> reasons,
            Integer speakingSpeedWpm,
            Integer fillerWordCount,
            Integer pauseCount,
            Integer clarityScore,
            Double eyeContactPercentage,
            Integer postureScore,
            String postureNote,
            String multimodalSummary
    ) {}

    public record SubmitAnswerResponse(EvaluationDto evaluation, QuestionDto followUpQuestion, boolean sessionComplete) {}

    public record QAHistoryItem(
            Long questionId,
            String topic,
            String questionText,
            String answerText,
            Integer overallScore,
            EvaluationDto evaluation
    ) {}

    public record SkillGapDto(List<String> weakAreas, List<String> strengths, Double averageScore) {}

    public record PrepDayDto(int day, String focus, List<String> tasks) {}

    public record SessionReportResponse(
            Long sessionId,
            List<QAHistoryItem> qaHistory,
            SkillGapDto skillGap,
            List<PrepDayDto> prepPlan,
            Double averageScore
    ) {}

    public record DashboardItem(
            Long sessionId,
            String status,
            Double averageScore,
            Double technicalAvg,
            Double communicationAvg,
            Double confidenceAvg,
            Double improvementPercentage,
            String createdAt
    ) {}

    public record DashboardTrendDto(
            List<DashboardItem> history,
            Double overallAverage,
            Integer totalSessions,
            Double bestScore,
            Map<String, Double> dimensionAverages,
            List<String> topStrengths,
            List<String> recurringGaps
    ) {}

    public record CurrentQuestionResponse(QuestionDto question, boolean sessionComplete) {}
}
