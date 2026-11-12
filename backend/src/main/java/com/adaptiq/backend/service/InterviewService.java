package com.adaptiq.backend.service;

import com.adaptiq.backend.dto.InterviewDtos.*;
import com.adaptiq.backend.model.*;
import com.adaptiq.backend.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class InterviewService {

    private static final Logger log = LoggerFactory.getLogger(InterviewService.class);

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
    private final GeminiService geminiService;
    private final JsonUtil jsonUtil;
    private final ObjectMapper objectMapper;

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
                             GeminiService geminiService,
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
        this.geminiService = geminiService;
        this.jsonUtil = jsonUtil;
        this.objectMapper = new ObjectMapper();
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
        List<String> projects = jsonUtil.toStringList(resume.getExtractedProjectsJson());
        List<String> requirements = jd != null ? jsonUtil.toStringList(jd.getExtractedRequirementsJson()) : List.of();

        int count = request.questionCount() != null ? request.questionCount() : 5;

        InterviewSession session = new InterviewSession();
        session.setUser(user);
        session.setResume(resume);
        session.setJobDescription(jd);
        session.setPlannedQuestionCount(count);
        sessionRepository.save(session);

        // Generate opening adaptive question tailored to candidate profile and target role
        Map<String, Object> initialQ = generateAdaptiveQuestionInternal(
                skills, projects, requirements, null, null, null, null, "medium", List.of(), 1);

        Question q = new Question();
        q.setSession(session);
        q.setText((String) initialQ.get("text"));
        q.setTopic((String) initialQ.get("topic"));
        q.setDifficulty((String) initialQ.getOrDefault("difficulty", "medium"));
        q.setOrderIndex(1);
        questionRepository.save(q);

        QuestionDto questionDto = new QuestionDto(q.getId(), q.getText(), q.getTopic(), q.getDifficulty());
        return new StartResponse(session.getId(), List.of(questionDto));
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

        Map<String, Object> result = evaluateAnswerInternal(
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

        boolean finishRequested = Boolean.TRUE.equals(request.finishSession());
        boolean sessionComplete = finishRequested || answeredCount >= 20;
        QuestionDto followUp = null;

        if (!sessionComplete) {
            List<String> askedTopics = allQuestions.stream().map(Question::getTopic).collect(Collectors.toList());
            List<String> skills = jsonUtil.toStringList(session.getResume().getExtractedSkillsJson());
            List<String> projects = jsonUtil.toStringList(session.getResume().getExtractedProjectsJson());
            List<String> requirements = session.getJobDescription() != null
                    ? jsonUtil.toStringList(session.getJobDescription().getExtractedRequirementsJson())
                    : List.of();

            String currentDiff = question.getDifficulty();
            Integer previousScore = answer.getOverallScore();

            // Generate next question adaptively based on candidate's previous response and untested skills
            Map<String, Object> nextQ = generateAdaptiveQuestionInternal(
                    skills, projects, requirements,
                    question.getText(), request.answerText(), question.getTopic(),
                    previousScore, currentDiff, askedTopics, (int) answeredCount + 1);

            Question next = new Question();
            next.setSession(session);
            next.setText((String) nextQ.get("text"));
            next.setTopic((String) nextQ.get("topic"));
            next.setDifficulty((String) nextQ.getOrDefault("difficulty", "medium"));
            next.setOrderIndex(allQuestions.size() + 1);
            questionRepository.save(next);

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

        List<String> resumeSkills = jsonUtil.toStringList(session.getResume().getExtractedSkillsJson());
        List<String> resumeProjects = jsonUtil.toStringList(session.getResume().getExtractedProjectsJson());
        List<String> jdRequirements = session.getJobDescription() != null
                ? jsonUtil.toStringList(session.getJobDescription().getExtractedRequirementsJson())
                : List.of();

        Map<String, Object> gapResult = skillGapInternal(qaForAi, resumeSkills, resumeProjects, jdRequirements);
        List<String> weakAreas = (List<String>) gapResult.getOrDefault("weakAreas", List.of());
        List<String> strengths = (List<String>) gapResult.getOrDefault("strengths", List.of());
        List<String> missingJdSkills = (List<String>) gapResult.getOrDefault("missingJdSkills", List.of());
        Double averageScore = ((Number) gapResult.getOrDefault("averageScore", 0.0)).doubleValue();

        SkillGapResult gapEntity = skillGapResultRepository.findBySession(session).orElseGet(SkillGapResult::new);
        gapEntity.setSession(session);
        gapEntity.setWeakAreasJson(jsonUtil.toJson(weakAreas));
        gapEntity.setStrengthsJson(jsonUtil.toJson(strengths));
        gapEntity.setMissingJdSkillsJson(jsonUtil.toJson(missingJdSkills));
        gapEntity.setAverageScore(averageScore);
        skillGapResultRepository.save(gapEntity);

        List<Map<String, Object>> planRaw = prepPlanInternal(weakAreas, 5);
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
        return new SessionReportResponse(session.getId(), qaHistory, new SkillGapDto(weakAreas, strengths, missingJdSkills, averageScore), plan, finalScore);
    }

    public SessionReportResponse finishSession(User user, Long sessionId) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        if (!session.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This session does not belong to you");
        }
        if (session.getStatus() != InterviewSession.Status.COMPLETED) {
            finalizeSession(session);
        }
        return getReport(user, sessionId);
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

        if (unanswered.isEmpty()) {
            long answeredCount = questions.stream().filter(q -> answerRepository.findByQuestion(q).isPresent()).count();
            if (answeredCount >= 20) {
                finalizeSession(session);
                return new CurrentQuestionResponse(null, true);
            }
            List<String> askedTopics = questions.stream().map(Question::getTopic).collect(Collectors.toList());
            List<String> skills = jsonUtil.toStringList(session.getResume().getExtractedSkillsJson());
            List<String> projects = jsonUtil.toStringList(session.getResume().getExtractedProjectsJson());
            List<String> requirements = session.getJobDescription() != null
                    ? jsonUtil.toStringList(session.getJobDescription().getExtractedRequirementsJson())
                    : List.of();

            Question lastQ = !questions.isEmpty() ? questions.get(questions.size() - 1) : null;
            Optional<Answer> lastA = lastQ != null ? answerRepository.findByQuestion(lastQ) : Optional.empty();

            Map<String, Object> nextQ = generateAdaptiveQuestionInternal(
                    skills, projects, requirements,
                    lastQ != null ? lastQ.getText() : null,
                    lastA.map(Answer::getAnswerText).orElse(""),
                    lastQ != null ? lastQ.getTopic() : null,
                    lastA.map(Answer::getOverallScore).orElse(70),
                    lastQ != null ? lastQ.getDifficulty() : "medium",
                    askedTopics, (int) answeredCount + 1);

            Question next = new Question();
            next.setSession(session);
            next.setText((String) nextQ.get("text"));
            next.setTopic((String) nextQ.get("topic"));
            next.setDifficulty((String) nextQ.getOrDefault("difficulty", "medium"));
            next.setOrderIndex(questions.size() + 1);
            questionRepository.save(next);

            return new CurrentQuestionResponse(new QuestionDto(next.getId(), next.getText(), next.getTopic(), next.getDifficulty()), false);
        }

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

    @SuppressWarnings("unchecked")
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

        // Compute real multimodal metrics from all evaluation records of this user
        List<InterviewSession> userSessions = sessionRepository.findByUserOrderByCreatedAtDesc(user);
        List<Evaluation> allEvals = userSessions.stream()
                .flatMap(s -> evaluationRepository.findBySessionOrderByCreatedAtAsc(s).stream())
                .collect(Collectors.toList());

        double avgWpm = allEvals.stream()
                .filter(e -> e.getSpeakingSpeedWpm() != null && e.getSpeakingSpeedWpm() > 0)
                .mapToInt(Evaluation::getSpeakingSpeedWpm)
                .average()
                .orElse(0.0);

        double avgFillers = allEvals.stream()
                .filter(e -> e.getFillerWordCount() != null)
                .mapToInt(Evaluation::getFillerWordCount)
                .average()
                .orElse(0.0);

        double avgEyeContact = allEvals.stream()
                .filter(e -> e.getEyeContactPercentage() != null && e.getEyeContactPercentage() > 0)
                .mapToDouble(Evaluation::getEyeContactPercentage)
                .average()
                .orElse(0.0);

        double avgPosture = allEvals.stream()
                .filter(e -> e.getPostureScore() != null && e.getPostureScore() > 0)
                .mapToInt(Evaluation::getPostureScore)
                .average()
                .orElse(0.0);

        // Compute real strengths and gaps from user's skill gap results
        List<String> userStrengths = new ArrayList<>();
        List<String> userGaps = new ArrayList<>();
        for (InterviewSession s : userSessions) {
            skillGapResultRepository.findBySession(s).ifPresent(sg -> {
                if (sg.getStrengthsJson() != null) {
                    try {
                        List<String> parsed = jsonUtil.fromJson(sg.getStrengthsJson(), List.class);
                        if (parsed != null) userStrengths.addAll(parsed);
                    } catch (Exception ignored) {}
                }
                if (sg.getWeakAreasJson() != null) {
                    try {
                        List<String> parsed = jsonUtil.fromJson(sg.getWeakAreasJson(), List.class);
                        if (parsed != null) userGaps.addAll(parsed);
                    } catch (Exception ignored) {}
                }
            });
        }
        List<String> distinctStrengths = userStrengths.stream().distinct().limit(4).collect(Collectors.toList());
        List<String> distinctGaps = userGaps.stream().distinct().limit(4).collect(Collectors.toList());

        if (distinctStrengths.isEmpty()) {
            distinctStrengths = List.of("System Architecture", "Verbal Articulation", "Visual Posture");
        }
        if (distinctGaps.isEmpty()) {
            distinctGaps = List.of("Deep Concurrency Diagnostics", "Direct Eye Contact Consistency");
        }

        return new DashboardTrendDto(
                items,
                Math.round(totalAvg * 10.0) / 10.0,
                items.size(),
                Math.round(best * 10.0) / 10.0,
                dims,
                distinctStrengths,
                distinctGaps,
                Math.round(avgWpm * 10.0) / 10.0,
                Math.round(avgFillers * 10.0) / 10.0,
                Math.round(avgEyeContact * 10.0) / 10.0,
                Math.round(avgPosture * 10.0) / 10.0
        );
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> generateAdaptiveQuestionInternal(
            List<String> skills, List<String> projects, List<String> requirements,
            String previousQuestion, String previousAnswer, String previousTopic,
            Integer previousScore, String currentDifficulty, List<String> askedTopics,
            int roundNumber) {
        if (geminiService.isConfigured()) {
            try {
                String targetDiff = currentDifficulty != null ? currentDifficulty : "medium";
                if (previousScore != null) {
                    if (previousScore >= 75) targetDiff = "hard";
                    else if (previousScore < 60) targetDiff = "easy";
                    else targetDiff = "medium";
                }

                String systemInstruction = "You are a Principal Software Engineering Interviewer. "
                        + "Generate the next adaptive interview question. Calibrate to candidate skills, projects, and target role. "
                        + "If candidate showed deep depth or a gap on the previous answer, probe with a follow-up. Otherwise pivot to an untested topic. "
                        + "Return strictly valid JSON.";

                String prompt = String.format("""
                        CANDIDATE SKILLS: %s
                        CANDIDATE PROJECTS: %s
                        ROLE REQUIREMENTS: %s
                        PREVIOUS TOPIC: %s
                        PREVIOUS QUESTION: %s
                        PREVIOUS ANSWER: %s
                        PREVIOUS SCORE: %s/100
                        ASKED TOPICS: %s
                        ROUND NUMBER: %d
                        TARGET DIFFICULTY: %s

                        Return strictly JSON:
                        {
                          "text": "The technical interview question...",
                          "topic": "Technology/Topic name",
                          "difficulty": "%s"
                        }
                        """,
                        skills, projects, requirements,
                        previousTopic != null ? previousTopic : "N/A",
                        previousQuestion != null ? previousQuestion : "N/A",
                        previousAnswer != null ? previousAnswer : "N/A",
                        previousScore != null ? previousScore : "N/A",
                        askedTopics, roundNumber, targetDiff, targetDiff
                );

                String json = geminiService.generateJson(systemInstruction, prompt);
                JsonNode root = objectMapper.readTree(json);
                String text = root.hasNonNull("text") ? root.get("text").asText()
                        : (root.hasNonNull("question") ? root.get("question").asText() : "");
                String topic = root.hasNonNull("topic") ? root.get("topic").asText()
                        : (!skills.isEmpty() ? skills.get(0) : "General");
                String diff = root.hasNonNull("difficulty") ? root.get("difficulty").asText() : targetDiff;

                if (!text.isBlank()) {
                    return Map.of("text", text, "topic", topic, "difficulty", diff);
                }
            } catch (Exception e) {
                log.warn("Gemini question generation fell back to AI service: {}", e.getMessage());
            }
        }
        return aiServiceClient.generateAdaptiveQuestion(skills, projects, requirements,
                previousQuestion, previousAnswer, previousTopic, previousScore, currentDifficulty, askedTopics, roundNumber);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> evaluateAnswerInternal(
            String questionText, String topic, String difficulty, String answerText,
            Map<String, Object> audioMetrics, Map<String, Object> visionMetrics) {
        if (geminiService.isConfigured()) {
            try {
                String systemInstruction = "You are an expert Technical Interview Evaluator. "
                        + "Evaluate the candidate's answer based on technical correctness, conceptual depth, relevance, communication clarity, and confidence. "
                        + "Accept alternative phrasing. Do not award high marks to vague or generic answers. "
                        + "Return strictly valid JSON.";

                String prompt = String.format("""
                        QUESTION (%s - %s difficulty):
                        %s

                        CANDIDATE ANSWER:
                        %s

                        Evaluate across 5 dimensions from 0 to 100:
                        1. technicalKnowledge (0-100)
                        2. relevance (0-100)
                        3. communication (0-100)
                        4. clarity (0-100)
                        5. confidence (0-100)
                        6. overallScore (0-100)

                        Provide concise rationales for each dimension in 'reasons', and a one-sentence 'multimodalSummary'.

                        Return strictly JSON:
                        {
                          "overallScore": 82,
                          "scores": {
                            "technicalKnowledge": 85,
                            "relevance": 85,
                            "communication": 80,
                            "clarity": 80,
                            "confidence": 80
                          },
                          "reasons": {
                            "technicalKnowledge": "...",
                            "relevance": "...",
                            "communication": "...",
                            "clarity": "...",
                            "confidence": "..."
                          },
                          "multimodalSummary": "Demonstrated solid technical depth and clear cadence."
                        }
                        """,
                        topic, difficulty, questionText, answerText
                );

                String json = geminiService.generateJson(systemInstruction, prompt);
                JsonNode root = objectMapper.readTree(json);
                int overall = root.hasNonNull("overallScore") ? root.get("overallScore").asInt() : 75;

                Map<String, Object> scoresMap = new HashMap<>();
                if (root.has("scores")) {
                    JsonNode sNode = root.get("scores");
                    scoresMap.put("technicalKnowledge", sNode.hasNonNull("technicalKnowledge") ? sNode.get("technicalKnowledge").asInt() : overall);
                    scoresMap.put("relevance", sNode.hasNonNull("relevance") ? sNode.get("relevance").asInt() : overall);
                    scoresMap.put("communication", sNode.hasNonNull("communication") ? sNode.get("communication").asInt() : overall);
                    scoresMap.put("clarity", sNode.hasNonNull("clarity") ? sNode.get("clarity").asInt() : overall);
                    scoresMap.put("confidence", sNode.hasNonNull("confidence") ? sNode.get("confidence").asInt() : overall);
                } else {
                    scoresMap.put("technicalKnowledge", overall);
                    scoresMap.put("relevance", overall);
                    scoresMap.put("communication", overall);
                    scoresMap.put("clarity", overall);
                    scoresMap.put("confidence", overall);
                }

                Map<String, String> reasonsMap = new HashMap<>();
                if (root.has("reasons")) {
                    root.get("reasons").fields().forEachRemaining(entry -> reasonsMap.put(entry.getKey(), entry.getValue().asText()));
                } else {
                    reasonsMap.put("technicalKnowledge", "Evaluated technical depth.");
                }

                String summary = root.hasNonNull("multimodalSummary")
                        ? root.get("multimodalSummary").asText()
                        : "Demonstrated technical understanding with structured delivery.";

                Map<String, Object> out = new HashMap<>();
                out.put("overallScore", overall);
                out.put("scores", scoresMap);
                out.put("reasons", reasonsMap);
                out.put("multimodalSummary", summary);
                out.put("audioMetrics", audioMetrics);
                out.put("visionMetrics", visionMetrics);
                return out;
            } catch (Exception e) {
                log.warn("Gemini answer evaluation fell back to AI service: {}", e.getMessage());
            }
        }
        return aiServiceClient.evaluateAnswer(questionText, topic, difficulty, answerText, audioMetrics, visionMetrics);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> skillGapInternal(
            List<Map<String, Object>> qaForAi, List<String> resumeSkills, List<String> resumeProjects, List<String> jdRequirements) {
        if (geminiService.isConfigured()) {
            try {
                String systemInstruction = "You are a Senior Technical Recruiter conducting an explainable Skill-Gap Analysis. "
                        + "Compare the candidate's resume and interview performance against target job description requirements. "
                        + "Extract weakAreas, strengths, missingJdSkills, and averageScore. Return strictly valid JSON.";

                String prompt = String.format("""
                        RESUME SKILLS: %s
                        RESUME PROJECTS: %s
                        JOB REQUIREMENTS: %s
                        INTERVIEW ROUNDS: %s

                        Return strictly JSON:
                        {
                          "weakAreas": ["..."],
                          "strengths": ["..."],
                          "missingJdSkills": ["..."],
                          "averageScore": 75.0
                        }
                        """,
                        resumeSkills, resumeProjects, jdRequirements, jsonUtil.toJson(qaForAi)
                );

                String json = geminiService.generateJson(systemInstruction, prompt);
                JsonNode root = objectMapper.readTree(json);
                List<String> weak = new ArrayList<>();
                List<String> str = new ArrayList<>();
                List<String> missing = new ArrayList<>();
                if (root.has("weakAreas") && root.get("weakAreas").isArray()) {
                    for (JsonNode n : root.get("weakAreas")) if (n.isTextual()) weak.add(n.asText());
                }
                if (root.has("strengths") && root.get("strengths").isArray()) {
                    for (JsonNode n : root.get("strengths")) if (n.isTextual()) str.add(n.asText());
                }
                if (root.has("missingJdSkills") && root.get("missingJdSkills").isArray()) {
                    for (JsonNode n : root.get("missingJdSkills")) if (n.isTextual()) missing.add(n.asText());
                }
                double avg = root.hasNonNull("averageScore") ? root.get("averageScore").asDouble() : 75.0;

                return Map.of("weakAreas", weak, "strengths", str, "missingJdSkills", missing, "averageScore", avg);
            } catch (Exception e) {
                log.warn("Gemini skill-gap fell back to AI service: {}", e.getMessage());
            }
        }
        return aiServiceClient.skillGap(qaForAi, resumeSkills, resumeProjects, jdRequirements);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> prepPlanInternal(List<String> weakAreas, int days) {
        if (geminiService.isConfigured()) {
            try {
                String systemInstruction = "You are a Technical Interview Coach. Create a personalized day-by-day preparation plan for the candidate's weak areas. Return strictly valid JSON.";
                String prompt = String.format("""
                        WEAK AREAS TO TARGET: %s
                        NUMBER OF DAYS: %d

                        Return strictly JSON:
                        {
                          "plan": [
                            {
                              "day": 1,
                              "focus": "...",
                              "tasks": ["...", "..."]
                            }
                          ]
                        }
                        """,
                        weakAreas, days
                );

                String json = geminiService.generateJson(systemInstruction, prompt);
                JsonNode root = objectMapper.readTree(json);
                JsonNode planNode = root.has("plan") ? root.get("plan") : root;
                List<Map<String, Object>> plan = new ArrayList<>();
                if (planNode.isArray()) {
                    for (JsonNode n : planNode) {
                        int day = n.hasNonNull("day") ? n.get("day").asInt() : 1;
                        String focus = n.hasNonNull("focus") ? n.get("focus").asText() : "Targeted Drill";
                        List<String> tasks = new ArrayList<>();
                        if (n.has("tasks") && n.get("tasks").isArray()) {
                            for (JsonNode t : n.get("tasks")) if (t.isTextual()) tasks.add(t.asText());
                        }
                        plan.add(Map.of("day", day, "focus", focus, "tasks", tasks));
                    }
                    if (!plan.isEmpty()) return plan;
                }
            } catch (Exception e) {
                log.warn("Gemini prep-plan fell back to AI service: {}", e.getMessage());
            }
        }
        return aiServiceClient.prepPlan(weakAreas, days);
    }
}
