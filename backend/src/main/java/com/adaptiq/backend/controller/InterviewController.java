package com.adaptiq.backend.controller;

import com.adaptiq.backend.dto.InterviewDtos.*;
import com.adaptiq.backend.model.User;
import com.adaptiq.backend.service.AiServiceClient;
import com.adaptiq.backend.service.InterviewService;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/interviews")
public class InterviewController {

    private final InterviewService interviewService;
    private final AiServiceClient aiServiceClient;

    public InterviewController(InterviewService interviewService, AiServiceClient aiServiceClient) {
        this.interviewService = interviewService;
        this.aiServiceClient = aiServiceClient;
    }

    @PostMapping("/start")
    public StartResponse start(@AuthenticationPrincipal User user, @RequestBody StartRequest request) {
        return interviewService.start(user, request);
    }

    @PostMapping("/answer")
    public SubmitAnswerResponse answer(@AuthenticationPrincipal User user, @RequestBody SubmitAnswerRequest request) {
        return interviewService.submitAnswer(user, request);
    }

    @GetMapping("/{sessionId}/current")
    public CurrentQuestionResponse current(@AuthenticationPrincipal User user, @PathVariable Long sessionId) {
        return interviewService.getCurrentQuestion(user, sessionId);
    }

    @GetMapping("/{sessionId}/report")
    public SessionReportResponse report(@AuthenticationPrincipal User user, @PathVariable Long sessionId) {
        return interviewService.getReport(user, sessionId);
    }

    @PostMapping(value = "/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> transcribe(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) throws IOException {
        return aiServiceClient.transcribeAudio(file.getBytes(), file.getOriginalFilename());
    }

    @GetMapping("/coding/problems")
    public Map<String, Object> getCodingProblems(@AuthenticationPrincipal User user) {
        return aiServiceClient.getCodingProblems();
    }

    @PostMapping("/coding/execute")
    public Map<String, Object> executeCodingRound(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> request) {
        return aiServiceClient.executeCode(request);
    }
}
