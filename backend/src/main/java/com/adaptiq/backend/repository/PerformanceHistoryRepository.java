package com.adaptiq.backend.repository;

import com.adaptiq.backend.model.InterviewSession;
import com.adaptiq.backend.model.PerformanceHistory;
import com.adaptiq.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PerformanceHistoryRepository extends JpaRepository<PerformanceHistory, Long> {
    List<PerformanceHistory> findByUserOrderByCreatedAtAsc(User user);
    Optional<PerformanceHistory> findBySession(InterviewSession session);
}
