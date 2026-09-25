package com.adaptiq.backend.repository;

import com.adaptiq.backend.model.InterviewSession;
import com.adaptiq.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InterviewSessionRepository extends JpaRepository<InterviewSession, Long> {
    List<InterviewSession> findByUserOrderByCreatedAtDesc(User user);
}
