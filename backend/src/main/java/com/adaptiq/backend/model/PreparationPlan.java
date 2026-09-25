package com.adaptiq.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "preparation_plans")
@Getter
@Setter
@NoArgsConstructor
public class PreparationPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "session_id", unique = true)
    private InterviewSession session;

    @Lob
    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String planJson;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
