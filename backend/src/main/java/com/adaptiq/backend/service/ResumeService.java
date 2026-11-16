package com.adaptiq.backend.service;

import com.adaptiq.backend.dto.ResumeDtos.UploadRequest;
import com.adaptiq.backend.dto.ResumeDtos.UploadResponse;
import com.adaptiq.backend.model.JobDescription;
import com.adaptiq.backend.model.Resume;
import com.adaptiq.backend.model.User;
import com.adaptiq.backend.repository.JobDescriptionRepository;
import com.adaptiq.backend.repository.ResumeRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class ResumeService {

    private static final Logger log = LoggerFactory.getLogger(ResumeService.class);

    private final ResumeRepository resumeRepository;
    private final JobDescriptionRepository jobDescriptionRepository;
    private final AiServiceClient aiServiceClient;
    private final GeminiService geminiService;
    private final JsonUtil jsonUtil;
    private final ObjectMapper objectMapper;

    public ResumeService(ResumeRepository resumeRepository,
                          JobDescriptionRepository jobDescriptionRepository,
                          AiServiceClient aiServiceClient,
                          GeminiService geminiService,
                          JsonUtil jsonUtil) {
        this.resumeRepository = resumeRepository;
        this.jobDescriptionRepository = jobDescriptionRepository;
        this.aiServiceClient = aiServiceClient;
        this.geminiService = geminiService;
        this.jsonUtil = jsonUtil;
        this.objectMapper = new ObjectMapper();
    }

    @SuppressWarnings("unchecked")
    public UploadResponse upload(User user, UploadRequest request) {
        List<String> skills = new ArrayList<>();
        List<String> projects = new ArrayList<>();
        List<String> requirements = new ArrayList<>();

        if (geminiService.isConfigured()) {
            try {
                String systemInstruction = "You are a Technical Recruiter AI. Extract verified programming languages, frameworks, and tools in 'skills', "
                        + "concrete project names in 'projects', and target job requirements in 'requirements'. Return strictly valid JSON.";
                String prompt = String.format("""
                        Extract technical profile details from the resume and job description:

                        RESUME TEXT:
                        %s

                        JOB DESCRIPTION:
                        %s

                        Return strictly JSON:
                        {
                          "skills": ["..."],
                          "projects": ["..."],
                          "requirements": ["..."]
                        }
                        """,
                        request.resumeText() != null ? request.resumeText().substring(0, Math.min(request.resumeText().length(), 10000)) : "",
                        request.jdText() != null ? request.jdText() : ""
                );

                String json = geminiService.generateJson(systemInstruction, prompt);
                JsonNode root = objectMapper.readTree(json);
                if (root.has("skills") && root.get("skills").isArray()) {
                    for (JsonNode n : root.get("skills")) if (n.isTextual()) skills.add(n.asText());
                }
                if (root.has("projects") && root.get("projects").isArray()) {
                    for (JsonNode n : root.get("projects")) if (n.isTextual()) projects.add(n.asText());
                }
                if (root.has("requirements") && root.get("requirements").isArray()) {
                    for (JsonNode n : root.get("requirements")) if (n.isTextual()) requirements.add(n.asText());
                }
            } catch (Exception e) {
                log.warn("Gemini resume extraction fell back to AI service: {}", e.getMessage());
            }
        }

        if (skills.isEmpty() && projects.isEmpty()) {
            try {
                Map<String, Object> extraction = aiServiceClient.extractSkills(request.resumeText(), request.jdText());
                skills = (List<String>) extraction.getOrDefault("skills", List.of());
                projects = (List<String>) extraction.getOrDefault("projects", List.of());
                requirements = (List<String>) extraction.getOrDefault("requirements", List.of());
            } catch (Exception e) {
                log.warn("Fallback to heuristic extraction: {}", e.getMessage());
                skills = List.of("Software Engineering", "Core Principles");
            }
        }

        Resume resume = new Resume();
        resume.setUser(user);
        resume.setRawText(request.resumeText());
        resume.setExtractedSkillsJson(jsonUtil.toJson(skills));
        resume.setExtractedProjectsJson(jsonUtil.toJson(projects));
        resumeRepository.save(resume);

        Long jdId = null;
        if (request.jdText() != null && !request.jdText().isBlank()) {
            JobDescription jd = new JobDescription();
            jd.setUser(user);
            jd.setRawText(request.jdText());
            jd.setExtractedRequirementsJson(jsonUtil.toJson(requirements));
            jobDescriptionRepository.save(jd);
            jdId = jd.getId();
        }

        return new UploadResponse(resume.getId(), jdId, skills, projects, requirements);
    }

    public UploadResponse uploadFile(User user, MultipartFile resumeFile, String jdText, MultipartFile jdFile) {
        if (resumeFile == null || resumeFile.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Resume file is required");
        }

        String resumeText = extractText(resumeFile);
        String finalJdText = jdText != null ? jdText : "";
        if (jdFile != null && !jdFile.isEmpty()) {
            finalJdText = extractText(jdFile);
        }

        return upload(user, new UploadRequest(resumeText, finalJdText));
    }

    public String extractText(MultipartFile file) {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        try {
            if (filename.endsWith(".pdf") || "application/pdf".equals(file.getContentType())) {
                try (PDDocument document = Loader.loadPDF(file.getBytes())) {
                    PDFTextStripper stripper = new PDFTextStripper();
                    return stripper.getText(document);
                }
            } else if (filename.endsWith(".docx") || filename.endsWith(".doc")) {
                try (InputStream is = file.getInputStream();
                     XWPFDocument document = new XWPFDocument(is);
                     XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
                    return extractor.getText();
                }
            } else {
                return new String(file.getBytes(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            log.error("Failed to parse file text from {}", filename, e);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read file: " + e.getMessage());
        }
    }
}
