package com.adaptiq.backend.repository;

import com.adaptiq.backend.model.Answer;
import com.adaptiq.backend.model.Evaluation;
import com.adaptiq.backend.model.InterviewSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {
    Optional<Evaluation> findByAnswer(Answer answer);
    List<Evaluation> findBySessionOrderByCreatedAtAsc(InterviewSession session);
}
