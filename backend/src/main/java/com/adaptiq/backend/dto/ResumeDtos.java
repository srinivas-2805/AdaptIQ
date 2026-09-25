package com.adaptiq.backend.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public class ResumeDtos {

    public record UploadRequest(@NotBlank String resumeText, String jdText) {}

    public record UploadResponse(
            Long resumeId,
            Long jobDescriptionId,
            List<String> skills,
            List<String> projects,
            List<String> requirements
    ) {}
}
