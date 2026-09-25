package com.adaptiq.backend.repository;

import com.adaptiq.backend.model.InterviewSession;
import com.adaptiq.backend.model.SkillGapResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SkillGapResultRepository extends JpaRepository<SkillGapResult, Long> {
    Optional<SkillGapResult> findBySession(InterviewSession session);
}
