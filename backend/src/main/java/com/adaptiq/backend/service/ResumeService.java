package com.adaptiq.backend.service;

import com.adaptiq.backend.dto.ResumeDtos.UploadRequest;
import com.adaptiq.backend.dto.ResumeDtos.UploadResponse;
import com.adaptiq.backend.model.JobDescription;
import com.adaptiq.backend.model.Resume;
import com.adaptiq.backend.model.User;
import com.adaptiq.backend.repository.JobDescriptionRepository;
import com.adaptiq.backend.repository.ResumeRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
public class ResumeService {

    private static final Logger log = LoggerFactory.getLogger(ResumeService.class);

    private final ResumeRepository resumeRepository;
    private final JobDescriptionRepository jobDescriptionRepository;
    private final AiServiceClient aiServiceClient;
    private final JsonUtil jsonUtil;

    public ResumeService(ResumeRepository resumeRepository,
                          JobDescriptionRepository jobDescriptionRepository,
                          AiServiceClient aiServiceClient,
                          JsonUtil jsonUtil) {
        this.resumeRepository = resumeRepository;
        this.jobDescriptionRepository = jobDescriptionRepository;
        this.aiServiceClient = aiServiceClient;
        this.jsonUtil = jsonUtil;
    }

    @SuppressWarnings("unchecked")
    public UploadResponse upload(User user, UploadRequest request) {
        Map<String, Object> extraction = aiServiceClient.extractSkills(request.resumeText(), request.jdText());
        List<String> skills = (List<String>) extraction.getOrDefault("skills", List.of());
        List<String> projects = (List<String>) extraction.getOrDefault("projects", List.of());
        List<String> requirements = (List<String>) extraction.getOrDefault("requirements", List.of());

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

    private String extractText(MultipartFile file) {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        try {
            if (filename.endsWith(".pdf") || "application/pdf".equals(file.getContentType())) {
                try (PDDocument document = Loader.loadPDF(file.getBytes())) {
                    PDFTextStripper stripper = new PDFTextStripper();
                    return stripper.getText(document);
                }
            } else {
                return new String(file.getBytes(), StandardCharsets.UTF_8);
            }
        } catch (IOException e) {
            log.error("Failed to parse file text from {}", filename, e);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read file: " + e.getMessage());
        }
    }
}
