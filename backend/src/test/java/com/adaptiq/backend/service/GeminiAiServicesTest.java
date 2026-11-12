package com.adaptiq.backend.service;

import com.adaptiq.backend.config.GeminiConfig;
import com.adaptiq.backend.dto.AiDtos.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GeminiAiServicesTest {

    @Mock
    private GeminiConfig geminiConfig;

    @Mock
    private GeminiService geminiService;

    private InterviewQuestionService questionService;
    private AnswerEvaluationService evaluationService;
    private FeedbackService feedbackService;
    private ResumeAnalysisService resumeAnalysisService;

    @BeforeEach
    void setUp() {
        questionService = new InterviewQuestionService(geminiService);
        evaluationService = new AnswerEvaluationService(geminiService);
        feedbackService = new FeedbackService(geminiService);
        resumeAnalysisService = new ResumeAnalysisService(geminiService);
    }

    @Test
    void testGeminiServiceMissingApiKeyThrowsServiceUnavailable() {
        when(geminiConfig.isApiKeyConfigured()).thenReturn(false);
        GeminiService service = new GeminiService(geminiConfig);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                service.generateJson("System", "Prompt")
        );
        assertEquals(503, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("GEMINI_API_KEY"));
    }

    @Test
    void testCleanJsonResponseRemovesFences() {
        GeminiService service = new GeminiService(geminiConfig);
        String fenced = "```json\n{\"test\": 123}\n```";
        assertEquals("{\"test\": 123}", service.cleanJsonResponse(fenced));

        String plain = "{\"test\": 123}";
        assertEquals("{\"test\": 123}", service.cleanJsonResponse(plain));
    }

    @Test
    void testQuestionGenerationSuccess() {
        String mockAiJson = """
                {
                  "questions": [
                    {
                      "id": "q-1",
                      "question": "Explain JVM memory model heap vs stack.",
                      "topic": "Java",
                      "difficulty": "Intermediate",
                      "expectedAnswer": "Heap stores objects; Stack stores method frames and local primitives."
                    }
                  ]
                }
                """;
        when(geminiService.generateJson(anyString(), anyString())).thenReturn(mockAiJson);

        QuestionRequest request = new QuestionRequest("Java Developer", List.of("Java", "Spring Boot"), "Mid-Level", "Intermediate", 1);
        QuestionResponse response = questionService.generateQuestions(request);

        assertNotNull(response);
        assertEquals("Java Developer", response.role());
        assertEquals("Intermediate", response.difficulty());
        assertEquals(1, response.count());
        assertEquals(1, response.questions().size());
        assertEquals("Explain JVM memory model heap vs stack.", response.questions().get(0).question());
        assertEquals("Java", response.questions().get(0).topic());
    }

    @Test
    void testAnswerEvaluationSuccessAndScoreClamping() {
        String mockAiJson = """
                {
                  "score": 8.5,
                  "correctness": "Correct",
                  "technicalAccuracy": "Accurately distinguished HashMap vs ConcurrentHashMap.",
                  "missingConcepts": ["CAS operations in Java 8 node insertion"],
                  "strengths": ["Clear explanation of synchronized segments"],
                  "areasForImprovement": ["Touch upon load factor"],
                  "suggestedImprovedAnswer": "ConcurrentHashMap uses segmented locking and CAS."
                }
                """;
        when(geminiService.generateJson(anyString(), anyString())).thenReturn(mockAiJson);

        AnswerEvaluationRequest request = new AnswerEvaluationRequest(
                "How does ConcurrentHashMap achieve thread safety?",
                "Uses CAS and synchronized nodes",
                "It uses CAS and synchronized bucket nodes instead of table-wide locks.",
                "Java Developer",
                "Intermediate"
        );

        AnswerEvaluationResponse response = evaluationService.evaluateAnswer(request);

        assertNotNull(response);
        assertEquals(8.5, response.score());
        assertEquals("Correct", response.correctness());
        assertTrue(response.strengths().contains("Clear explanation of synchronized segments"));
        assertTrue(response.missingConcepts().contains("CAS operations in Java 8 node insertion"));
    }

    @Test
    void testAnswerEvaluationClampsScoreBetweenZeroAndTen() {
        String mockAiJson = """
                {
                  "score": 15.0,
                  "correctness": "Correct",
                  "technicalAccuracy": "Perfect",
                  "missingConcepts": [],
                  "strengths": ["Everything"],
                  "areasForImprovement": [],
                  "suggestedImprovedAnswer": "Good answer"
                }
                """;
        when(geminiService.generateJson(anyString(), anyString())).thenReturn(mockAiJson);

        AnswerEvaluationRequest request = new AnswerEvaluationRequest(
                "Question", "Expected", "Answer", "Role", "Diff"
        );
        AnswerEvaluationResponse response = evaluationService.evaluateAnswer(request);
        assertEquals(10.0, response.score());
    }

    @Test
    void testFeedbackGenerationSuccess() {
        String mockAiJson = """
                {
                  "overallSummary": "Candidate demonstrated solid Core Java knowledge with minor gaps in distributed transactions.",
                  "technicalStrengths": ["Core Java", "Spring Boot DI"],
                  "weakAreas": ["Distributed Saga pattern"],
                  "topicSuggestions": [
                    {"topic": "Distributed Transactions", "suggestion": "Study 2-phase commit and Saga pattern"}
                  ],
                  "recommendedTopics": ["Kafka", "Microservices Patterns"],
                  "practicalSuggestions": ["Implement a small saga orchestration project"],
                  "preparationPlan": [
                    {"day": 1, "focus": "Concurrency", "tasks": ["Read JMM spec", "Solve producer-consumer"]}
                  ]
                }
                """;
        when(geminiService.generateJson(anyString(), anyString())).thenReturn(mockAiJson);

        FeedbackRequest request = new FeedbackRequest(
                "Java Developer",
                List.of("What is JVM?"),
                List.of("JVM is Java Virtual Machine that runs bytecode."),
                List.of(8.0),
                8.0,
                List.of("Java Core"),
                List.of("Distributed Systems")
        );

        FeedbackResponse response = feedbackService.generateFeedback(request);

        assertNotNull(response);
        assertTrue(response.overallSummary().contains("Candidate demonstrated solid"));
        assertEquals(1, response.topicSuggestions().size());
        assertEquals("Distributed Transactions", response.topicSuggestions().get(0).topic());
        assertEquals(1, response.preparationPlan().size());
        assertEquals(1, response.preparationPlan().get(0).day());
    }

    @Test
    void testResumeAnalysisRejectsEmptyFile() {
        MockMultipartFile emptyFile = new MockMultipartFile("resume", "resume.pdf", "application/pdf", new byte[0]);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                resumeAnalysisService.analyzeResumeAndGenerateQuestions(emptyFile, 5)
        );
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void testResumeAnalysisRejectsUnsupportedFileType() {
        MockMultipartFile txtFile = new MockMultipartFile("resume", "resume.txt", "text/plain", "Some resume content here...".getBytes());
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                resumeAnalysisService.analyzeResumeAndGenerateQuestions(txtFile, 5)
        );
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("PDF (.pdf) or DOCX (.docx)"));
    }
}
