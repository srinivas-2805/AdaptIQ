package com.adaptiq.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "answers")
@Getter
@Setter
@NoArgsConstructor
public class Answer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "question_id", unique = true)
    private Question question;

    @Lob
    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String answerText;

    private Integer technicalKnowledge;
    private Integer relevance;
    private Integer communication;
    private Integer clarity;
    private Integer confidence;
    private Integer overallScore;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String reasonsJson;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
