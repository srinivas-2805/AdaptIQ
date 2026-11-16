package com.adaptiq.backend.controller;

import com.adaptiq.backend.config.GeminiConfig;
import com.adaptiq.backend.dto.AiDtos.*;
import com.adaptiq.backend.model.User;
import com.adaptiq.backend.service.AnswerEvaluationService;
import com.adaptiq.backend.service.FeedbackService;
import com.adaptiq.backend.service.InterviewQuestionService;
import com.adaptiq.backend.service.ResumeAnalysisService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AIInterviewController {

    private final GeminiConfig geminiConfig;
    private final InterviewQuestionService questionService;
    private final AnswerEvaluationService evaluationService;
    private final FeedbackService feedbackService;
    private final ResumeAnalysisService resumeAnalysisService;

    public AIInterviewController(GeminiConfig geminiConfig,
                                 InterviewQuestionService questionService,
                                 AnswerEvaluationService evaluationService,
                                 FeedbackService feedbackService,
                                 ResumeAnalysisService resumeAnalysisService) {
        this.geminiConfig = geminiConfig;
        this.questionService = questionService;
        this.evaluationService = evaluationService;
        this.feedbackService = feedbackService;
        this.resumeAnalysisService = resumeAnalysisService;
    }

    /**
     * Check if Gemini AI integration is configured and ready.
     */
    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of(
                "provider", "Google Gemini AI",
                "configured", geminiConfig.isApiKeyConfigured(),
                "model", geminiConfig.getModel()
        );
    }

    /**
     * Feature 1: AI Interview Question Generation based on job role, tech stack, and difficulty.
     */
    @PostMapping("/questions/generate")
    public QuestionResponse generateQuestions(@AuthenticationPrincipal User user,
                                               @Valid @RequestBody QuestionRequest request) {
        return questionService.generateQuestions(request);
    }

    /**
     * Feature 2: Candidate Answer Evaluation against question and technical criteria.
     */
    @PostMapping("/answers/evaluate")
    public AnswerEvaluationResponse evaluateAnswer(@AuthenticationPrincipal User user,
                                                   @Valid @RequestBody AnswerEvaluationRequest request) {
        return evaluationService.evaluateAnswer(request);
    }

    /**
     * Feature 3: Personalized Candidate Feedback Generation based on interview performance.
     */
    @PostMapping("/feedback/generate")
    public FeedbackResponse generateFeedback(@AuthenticationPrincipal User user,
                                             @Valid @RequestBody FeedbackRequest request) {
        return feedbackService.generateFeedback(request);
    }

    /**
     * Feature 4: Resume-Based Interview Question Generation from PDF or DOCX files.
     */
    @PostMapping(value = "/resume/questions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResumeQuestionResponse generateResumeQuestions(
            @AuthenticationPrincipal User user,
            @RequestParam(value = "resume", required = false) MultipartFile resume,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "resumeFile", required = false) MultipartFile resumeFile,
            @RequestParam(value = "numberOfQuestions", required = false, defaultValue = "5") Integer numberOfQuestions) {
        MultipartFile target = resume != null ? resume : (file != null ? file : resumeFile);
        if (target == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A resume file (PDF or DOCX) is required");
        }
        return resumeAnalysisService.analyzeResumeAndGenerateQuestions(target, numberOfQuestions);
    }
}
