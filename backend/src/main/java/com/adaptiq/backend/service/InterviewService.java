package com.adaptiq.backend.service;

import com.adaptiq.backend.dto.InterviewDtos.*;
import com.adaptiq.backend.model.*;
import com.adaptiq.backend.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class InterviewService {

    private final InterviewSessionRepository sessionRepository;
    private final ResumeRepository resumeRepository;
    private final JobDescriptionRepository jobDescriptionRepository;
    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final EvaluationRepository evaluationRepository;
    private final PerformanceHistoryRepository performanceHistoryRepository;
    private final SkillGapResultRepository skillGapResultRepository;
    private final PreparationPlanRepository preparationPlanRepository;
    private final AiServiceClient aiServiceClient;
    private final JsonUtil jsonUtil;

    private static final int ABSOLUTE_MAX_QUESTIONS = 10;

    public InterviewService(InterviewSessionRepository sessionRepository,
                             ResumeRepository resumeRepository,
                             JobDescriptionRepository jobDescriptionRepository,
                             QuestionRepository questionRepository,
                             AnswerRepository answerRepository,
                             EvaluationRepository evaluationRepository,
                             PerformanceHistoryRepository performanceHistoryRepository,
                             SkillGapResultRepository skillGapResultRepository,
                             PreparationPlanRepository preparationPlanRepository,
                             AiServiceClient aiServiceClient,
                             JsonUtil jsonUtil) {
        this.sessionRepository = sessionRepository;
        this.resumeRepository = resumeRepository;
        this.jobDescriptionRepository = jobDescriptionRepository;
        this.questionRepository = questionRepository;
        this.answerRepository = answerRepository;
        this.evaluationRepository = evaluationRepository;
        this.performanceHistoryRepository = performanceHistoryRepository;
        this.skillGapResultRepository = skillGapResultRepository;
        this.preparationPlanRepository = preparationPlanRepository;
        this.aiServiceClient = aiServiceClient;
        this.jsonUtil = jsonUtil;
    }

    @SuppressWarnings("unchecked")
    public StartResponse start(User user, StartRequest request) {
        Resume resume = resumeRepository.findById(request.resumeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resume not found"));
        if (!resume.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This resume does not belong to you");
        }

        JobDescription jd = null;
        if (request.jobDescriptionId() != null) {
            jd = jobDescriptionRepository.findById(request.jobDescriptionId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job description not found"));
        }

        List<String> skills = jsonUtil.toStringList(resume.getExtractedSkillsJson());
        List<String> requirements = jd != null ? jsonUtil.toStringList(jd.getExtractedRequirementsJson()) : List.of();

        int count = request.questionCount() != null ? Math.min(request.questionCount(), 8) : 5;

        InterviewSession session = new InterviewSession();
        session.setUser(user);
        session.setResume(resume);
        session.setJobDescription(jd);
        session.setPlannedQuestionCount(count);
        sessionRepository.save(session);

        List<Map<String, Object>> generated = aiServiceClient.generateQuestions(skills, requirements, count);

        List<QuestionDto> questionDtos = generated.stream().map(g -> {
            Question q = new Question();
            q.setSession(session);
            q.setText((String) g.get("text"));
            q.setTopic((String) g.get("topic"));
            q.setDifficulty((String) g.get("difficulty"));
            q.setOrderIndex(questionRepository.findBySessionOrderByOrderIndexAsc(session).size() + 1);
            questionRepository.save(q);
            return new QuestionDto(q.getId(), q.getText(), q.getTopic(), q.getDifficulty());
        }).collect(Collectors.toList());

        return new StartResponse(session.getId(), questionDtos);
    }

    @SuppressWarnings("unchecked")
    public SubmitAnswerResponse submitAnswer(User user, SubmitAnswerRequest request) {
        Question question = questionRepository.findById(request.questionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        InterviewSession session = question.getSession();

        if (!session.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This question does not belong to you");
        }
        if (session.getStatus() == InterviewSession.Status.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This interview session is already completed");
        }
        if (answerRepository.findByQuestion(question).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This question has already been answered");
        }

        Map<String, Object> audioMap = request.audioMetrics() != null ? jsonUtil.toMap(jsonUtil.toJson(request.audioMetrics())) : null;
        Map<String, Object> visionMap = request.visionMetrics() != null ? jsonUtil.toMap(jsonUtil.toJson(request.visionMetrics())) : null;

        Map<String, Object> result = aiServiceClient.evaluateAnswer(
                question.getText(), question.getTopic(), question.getDifficulty(), request.answerText(),
                audioMap, visionMap);

        Map<String, Object> scores = (Map<String, Object>) result.get("scores");
        Map<String, Object> reasonsRaw = (Map<String, Object>) result.get("reasons");
        Map<String, String> reasons = reasonsRaw.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> String.valueOf(e.getValue())));

        Map<String, Object> audioResult = (Map<String, Object>) result.get("audioMetrics");
        Map<String, Object> visionResult = (Map<String, Object>) result.get("visionMetrics");
        String multimodalSummary = (String) result.get("multimodalSummary");

        Answer answer = new Answer();
        answer.setQuestion(question);
        answer.setAnswerText(request.answerText());
        answer.setTechnicalKnowledge(((Number) scores.get("technicalKnowledge")).intValue());
        answer.setRelevance(((Number) scores.get("relevance")).intValue());
        answer.setCommunication(((Number) scores.get("communication")).intValue());
        answer.setClarity(((Number) scores.get("clarity")).intValue());
        answer.setConfidence(((Number) scores.get("confidence")).intValue());
        answer.setOverallScore(((Number) result.get("overallScore")).intValue());
        answer.setReasonsJson(jsonUtil.toJson(reasons));
        answerRepository.save(answer);

        // Save detailed Evaluation entity
        Evaluation evaluation = new Evaluation();
        evaluation.setAnswer(answer);
        evaluation.setSession(session);
        evaluation.setTechnicalKnowledge(answer.getTechnicalKnowledge());
        evaluation.setRelevance(answer.getRelevance());
        evaluation.setCommunication(answer.getCommunication());
        evaluation.setClarity(answer.getClarity());
        evaluation.setConfidence(answer.getConfidence());
        evaluation.setOverallScore(answer.getOverallScore());
        evaluation.setReasonsJson(answer.getReasonsJson());

        if (audioResult != null) {
            if (audioResult.get("speakingSpeedWpm") != null) evaluation.setSpeakingSpeedWpm(((Number) audioResult.get("speakingSpeedWpm")).intValue());
            if (audioResult.get("fillerWordCount") != null) evaluation.setFillerWordCount(((Number) audioResult.get("fillerWordCount")).intValue());
            if (audioResult.get("pauseCount") != null) evaluation.setPauseCount(((Number) audioResult.get("pauseCount")).intValue());
            if (audioResult.get("clarityScore") != null) evaluation.setClarityScore(((Number) audioResult.get("clarityScore")).intValue());
        }
        if (visionResult != null) {
            if (visionResult.get("eyeContactPercentage") != null) evaluation.setEyeContactPercentage(((Number) visionResult.get("eyeContactPercentage")).doubleValue());
            if (visionResult.get("postureScore") != null) evaluation.setPostureScore(((Number) visionResult.get("postureScore")).intValue());
            if (visionResult.get("postureNote") != null) evaluation.setPostureNote((String) visionResult.get("postureNote"));
        }
        evaluation.setMultimodalSummary(multimodalSummary);
        evaluationRepository.save(evaluation);

        EvaluationDto evaluationDto = new EvaluationDto(
                answer.getTechnicalKnowledge(), answer.getRelevance(), answer.getCommunication(),
                answer.getClarity(), answer.getConfidence(), answer.getOverallScore(), reasons,
                evaluation.getSpeakingSpeedWpm(), evaluation.getFillerWordCount(), evaluation.getPauseCount(),
                evaluation.getClarityScore(), evaluation.getEyeContactPercentage(), evaluation.getPostureScore(),
                evaluation.getPostureNote(), evaluation.getMultimodalSummary()
        );

        List<Question> allQuestions = questionRepository.findBySessionOrderByOrderIndexAsc(session);
        long answeredCount = allQuestions.stream().filter(q -> answerRepository.findByQuestion(q).isPresent()).count();
        int maxAllowed = session.getPlannedQuestionCount();

        boolean sessionComplete = answeredCount >= maxAllowed;
        QuestionDto followUp = null;

        if (!sessionComplete) {
            String nextDifficulty = (String) result.getOrDefault("nextDifficulty", question.getDifficulty());
            int nextOrderIndex = question.getOrderIndex() + 1;

            Optional<Question> preGenerated = allQuestions.stream()
                    .filter(q -> q.getOrderIndex() == nextOrderIndex)
                    .findFirst();

            Question next;
            if (preGenerated.isPresent()) {
                next = preGenerated.get();
                next.setDifficulty(nextDifficulty);
                questionRepository.save(next);
            } else {
                String followUpText = aiServiceClient.generateFollowUp(
                        question.getText(), request.answerText(), question.getTopic());
                next = new Question();
                next.setSession(session);
                next.setText(followUpText);
                next.setTopic(question.getTopic());
                next.setDifficulty(nextDifficulty);
                next.setOrderIndex(allQuestions.size() + 1);
                questionRepository.save(next);
            }
            followUp = new QuestionDto(next.getId(), next.getText(), next.getTopic(), next.getDifficulty());
        } else {
            finalizeSession(session);
        }

        return new SubmitAnswerResponse(evaluationDto, followUp, sessionComplete);
    }

    private void finalizeSession(InterviewSession session) {
        List<Question> questions = questionRepository.findBySessionOrderByOrderIndexAsc(session);
        List<Answer> answers = questions.stream()
                .map(answerRepository::findByQuestion)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toList());

        double avg = answers.stream().mapToInt(Answer::getOverallScore).average().orElse(0.0);
        session.setAverageScore(avg);
        session.setStatus(InterviewSession.Status.COMPLETED);
        session.setCompletedAt(java.time.LocalDateTime.now());
        sessionRepository.save(session);

        // Record performance history
        double techAvg = answers.stream().mapToInt(Answer::getTechnicalKnowledge).average().orElse(avg);
        double relAvg = answers.stream().mapToInt(Answer::getRelevance).average().orElse(avg);
        double commAvg = answers.stream().mapToInt(Answer::getCommunication).average().orElse(avg);
        double clarAvg = answers.stream().mapToInt(Answer::getClarity).average().orElse(avg);
        double confAvg = answers.stream().mapToInt(Answer::getConfidence).average().orElse(avg);

        List<PerformanceHistory> pastList = performanceHistoryRepository.findByUserOrderByCreatedAtAsc(session.getUser());
        double improvement = 0.0;
        if (!pastList.isEmpty()) {
            double prevScore = pastList.get(pastList.size() - 1).getAverageScore();
            improvement = Math.round((avg - prevScore) * 10.0) / 10.0;
        }

        PerformanceHistory history = new PerformanceHistory();
        history.setUser(session.getUser());
        history.setSession(session);
        history.setAverageScore(avg);
        history.setTechnicalAvg(techAvg);
        history.setRelevanceAvg(relAvg);
        history.setCommunicationAvg(commAvg);
        history.setClarityAvg(clarAvg);
        history.setConfidenceAvg(confAvg);
        history.setImprovementPercentage(improvement);
        performanceHistoryRepository.save(history);
    }

    @SuppressWarnings("unchecked")
    public SessionReportResponse getReport(User user, Long sessionId) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        if (!session.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This session does not belong to you");
        }

        List<Question> questions = questionRepository.findBySessionOrderByOrderIndexAsc(session);

        List<QAHistoryItem> qaHistory = questions.stream()
                .map(q -> {
                    Optional<Answer> ansOpt = answerRepository.findByQuestion(q);
                    if (ansOpt.isEmpty()) return null;
                    Answer a = ansOpt.get();
                    Evaluation eval = evaluationRepository.findByAnswer(a).orElse(null);
                    Map<String, String> reasons = a.getReasonsJson() != null ? jsonUtil.fromJson(a.getReasonsJson(), Map.class) : Map.of();

                    EvaluationDto evalDto = new EvaluationDto(
                            a.getTechnicalKnowledge(), a.getRelevance(), a.getCommunication(),
                            a.getClarity(), a.getConfidence(), a.getOverallScore(), reasons,
                            eval != null ? eval.getSpeakingSpeedWpm() : null,
                            eval != null ? eval.getFillerWordCount() : null,
                            eval != null ? eval.getPauseCount() : null,
                            eval != null ? eval.getClarityScore() : null,
                            eval != null ? eval.getEyeContactPercentage() : null,
                            eval != null ? eval.getPostureScore() : null,
                            eval != null ? eval.getPostureNote() : null,
                            eval != null ? eval.getMultimodalSummary() : null
                    );
                    return new QAHistoryItem(q.getId(), q.getTopic(), q.getText(), a.getAnswerText(), a.getOverallScore(), evalDto);
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        List<Map<String, Object>> qaForAi = qaHistory.stream()
                .map(item -> {
                    Map<String, Object> entry = new HashMap<>();
                    entry.put("topic", item.topic());
                    entry.put("questionText", item.questionText());
                    entry.put("answerText", item.answerText());
                    entry.put("overallScore", item.overallScore());
                    return entry;
                })
                .collect(Collectors.toList());

        Map<String, Object> gapResult = aiServiceClient.skillGap(qaForAi);
        List<String> weakAreas = (List<String>) gapResult.getOrDefault("weakAreas", List.of());
        List<String> strengths = (List<String>) gapResult.getOrDefault("strengths", List.of());
        Double averageScore = ((Number) gapResult.getOrDefault("averageScore", 0.0)).doubleValue();

        SkillGapResult gapEntity = skillGapResultRepository.findBySession(session).orElseGet(SkillGapResult::new);
        gapEntity.setSession(session);
        gapEntity.setWeakAreasJson(jsonUtil.toJson(weakAreas));
        gapEntity.setStrengthsJson(jsonUtil.toJson(strengths));
        gapEntity.setAverageScore(averageScore);
        skillGapResultRepository.save(gapEntity);

        List<Map<String, Object>> planRaw = aiServiceClient.prepPlan(weakAreas, 5);
        List<PrepDayDto> plan = planRaw.stream()
                .map(p -> new PrepDayDto(
                        ((Number) p.get("day")).intValue(),
                        (String) p.get("focus"),
                        (List<String>) p.get("tasks")))
                .collect(Collectors.toList());

        PreparationPlan planEntity = preparationPlanRepository.findBySession(session).orElseGet(PreparationPlan::new);
        planEntity.setSession(session);
        planEntity.setPlanJson(jsonUtil.toJson(plan));
        preparationPlanRepository.save(planEntity);

        double finalScore = session.getAverageScore() != null ? session.getAverageScore() : averageScore;
        return new SessionReportResponse(session.getId(), qaHistory, new SkillGapDto(weakAreas, strengths, averageScore), plan, finalScore);
    }

    public CurrentQuestionResponse getCurrentQuestion(User user, Long sessionId) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        if (!session.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This session does not belong to you");
        }
        if (session.getStatus() == InterviewSession.Status.COMPLETED) {
            return new CurrentQuestionResponse(null, true);
        }

        List<Question> questions = questionRepository.findBySessionOrderByOrderIndexAsc(session);
        Optional<Question> unanswered = questions.stream()
                .filter(q -> answerRepository.findByQuestion(q).isEmpty())
                .findFirst();

        return unanswered
                .map(q -> new CurrentQuestionResponse(new QuestionDto(q.getId(), q.getText(), q.getTopic(), q.getDifficulty()), false))
                .orElse(new CurrentQuestionResponse(null, true));
    }

    public List<DashboardItem> dashboard(User user) {
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
        return sessionRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(s -> {
                    PerformanceHistory ph = performanceHistoryRepository.findBySession(s).orElse(null);
                    return new DashboardItem(
                            s.getId(),
                            s.getStatus().name(),
                            s.getAverageScore(),
                            ph != null ? ph.getTechnicalAvg() : null,
                            ph != null ? ph.getCommunicationAvg() : null,
                            ph != null ? ph.getConfidenceAvg() : null,
                            ph != null ? ph.getImprovementPercentage() : 0.0,
                            s.getCreatedAt().format(formatter));
                })
                .collect(Collectors.toList());
    }

    public DashboardTrendDto dashboardTrends(User user) {
        List<DashboardItem> items = dashboard(user);
        List<PerformanceHistory> histories = performanceHistoryRepository.findByUserOrderByCreatedAtAsc(user);

        double totalAvg = items.stream()
                .filter(i -> i.averageScore() != null)
                .mapToDouble(DashboardItem::averageScore)
                .average()
                .orElse(0.0);

        double best = items.stream()
                .filter(i -> i.averageScore() != null)
                .mapToDouble(DashboardItem::averageScore)
                .max()
                .orElse(0.0);

        double avgTech = histories.stream().filter(h -> h.getTechnicalAvg() != null).mapToDouble(PerformanceHistory::getTechnicalAvg).average().orElse(0.0);
        double avgComm = histories.stream().filter(h -> h.getCommunicationAvg() != null).mapToDouble(PerformanceHistory::getCommunicationAvg).average().orElse(0.0);
        double avgConf = histories.stream().filter(h -> h.getConfidenceAvg() != null).mapToDouble(PerformanceHistory::getConfidenceAvg).average().orElse(0.0);

        Map<String, Double> dims = Map.of(
                "technical", Math.round(avgTech * 10.0) / 10.0,
                "communication", Math.round(avgComm * 10.0) / 10.0,
                "confidence", Math.round(avgConf * 10.0) / 10.0
        );

        return new DashboardTrendDto(
                items,
                Math.round(totalAvg * 10.0) / 10.0,
                items.size(),
                Math.round(best * 10.0) / 10.0,
                dims,
                List.of("Microservices Architecture", "Clear Verbal Cadence", "Professional Visual Presence"),
                List.of("Deep Concurrency Diagnostics", "Direct Eye Contact Consistency")
        );
    }
}
