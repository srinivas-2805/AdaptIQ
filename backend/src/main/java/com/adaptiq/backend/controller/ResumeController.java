package com.adaptiq.backend.controller;

import com.adaptiq.backend.dto.ResumeDtos.UploadRequest;
import com.adaptiq.backend.dto.ResumeDtos.UploadResponse;
import com.adaptiq.backend.model.User;
import com.adaptiq.backend.service.ResumeService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    private final ResumeService resumeService;

    public ResumeController(ResumeService resumeService) {
        this.resumeService = resumeService;
    }

    @PostMapping
    public UploadResponse upload(@AuthenticationPrincipal User user, @Valid @RequestBody UploadRequest request) {
        return resumeService.upload(user, request);
    }

    @PostMapping(value = "/upload-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadResponse uploadFile(
            @AuthenticationPrincipal User user,
            @RequestParam("resumeFile") MultipartFile resumeFile,
            @RequestParam(value = "jdText", required = false) String jdText,
            @RequestParam(value = "jdFile", required = false) MultipartFile jdFile) {
        return resumeService.uploadFile(user, resumeFile, jdText, jdFile);
    }
}
