package com.adaptiq.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "skill_gap_results")
@Getter
@Setter
@NoArgsConstructor
public class SkillGapResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "session_id", unique = true)
    private InterviewSession session;

    @Lob
    private String weakAreasJson;

    @Lob
    private String strengthsJson;

    private Double averageScore;
}
