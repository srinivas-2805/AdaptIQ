package com.adaptiq.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "evaluations")
@Getter
@Setter
@NoArgsConstructor
public class Evaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "answer_id", unique = true)
    private Answer answer;

    @ManyToOne(optional = false)
    @JoinColumn(name = "session_id")
    private InterviewSession session;

    private Integer technicalKnowledge;
    private Integer relevance;
    private Integer communication;
    private Integer clarity;
    private Integer confidence;
    private Integer overallScore;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String reasonsJson;

    // Multimodal metrics
    private Integer speakingSpeedWpm;
    private Integer fillerWordCount;
    private Integer pauseCount;
    private Integer clarityScore;
    private Double eyeContactPercentage;
    private Integer postureScore;
    private String postureNote;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String multimodalSummary;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
