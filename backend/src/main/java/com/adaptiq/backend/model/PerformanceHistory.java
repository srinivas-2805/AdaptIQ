package com.adaptiq.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "performance_history")
@Getter
@Setter
@NoArgsConstructor
public class PerformanceHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "session_id")
    private InterviewSession session;

    @Column(nullable = false)
    private Double averageScore;

    private Double technicalAvg;
    private Double relevanceAvg;
    private Double communicationAvg;
    private Double clarityAvg;
    private Double confidenceAvg;

    private Double improvementPercentage;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
