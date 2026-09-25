package com.adaptiq.backend.repository;

import com.adaptiq.backend.model.Answer;
import com.adaptiq.backend.model.Question;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AnswerRepository extends JpaRepository<Answer, Long> {
    Optional<Answer> findByQuestion(Question question);
}
