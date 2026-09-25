package com.adaptiq.backend.repository;

import com.adaptiq.backend.model.InterviewSession;
import com.adaptiq.backend.model.Question;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findBySessionOrderByOrderIndexAsc(InterviewSession session);
}
