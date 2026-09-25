package com.adaptiq.backend.repository;

import com.adaptiq.backend.model.InterviewSession;
import com.adaptiq.backend.model.PreparationPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PreparationPlanRepository extends JpaRepository<PreparationPlan, Long> {
    Optional<PreparationPlan> findBySession(InterviewSession session);
}
