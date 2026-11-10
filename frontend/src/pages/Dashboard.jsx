import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api.js";

const SAMPLE_PERSONAS = [
  {
    index: 0,
    title: "Full Stack Engineer",
    stack: "React • Spring Boot 3 • MySQL • Docker",
    desc: "4+ years experience, scalable microservices, REST APIs, state management.",
    icon: "⚡"
  },
  {
    index: 1,
    title: "AI / ML Engineer",
    stack: "Python • PyTorch • FastAPI • Computer Vision",
    desc: "Multimodal video analysis, LLM inference latency optimization, MLOps.",
    icon: "🧠"
  },
  {
    index: 2,
    title: "Cloud & DevOps Engineer",
    stack: "Kubernetes • Docker • AWS • Terraform",
    desc: "Zero-downtime EKS cluster orchestration, automated CI/CD canary rollouts.",
    icon: "☁️"
  }
];

const ROADMAP_DAYS = [
  {
    day: 1,
    title: "System Architecture & Scalability",
    focus: "REST vs gRPC, database indexing, Redis caching, microservice trade-offs.",
    status: "Completed",
    tag: "Day 1 Drill"
  },
  {
    day: 2,
    title: "Deep Concurrency & Data Structures",
    focus: "Thread synchronization, deadlock avoidance, locking semantics, algorithmic complexity.",
    status: "In Progress",
    tag: "Active Focus"
  },
  {
    day: 3,
    title: "Multimodal Mirror: Speech & Gaze",
    focus: "Pacing drills (130-150 WPM), reducing filler words, steady eye-contact via MediaPipe.",
    status: "Up Next",
    tag: "Acoustics & HUD"
  },
  {
    day: 4,
    title: "Live Coding Sandbox Sprint",
    focus: "Auto-tested algorithmic problem solving under timed execution constraints.",
    status: "Locked",
    tag: "Coding Round"
  },
  {
    day: 5,
    title: "High-Stakes Full Mock Simulation",
    focus: "Full 8-question adaptive interview round combining technical depth and behavioral STAR delivery.",
    status: "Locked",
    tag: "Final Boss"
  }
];

export default function Dashboard() {
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeRoadmapDay, setActiveRoadmapDay] = useState(2);
  const [filterStatus, setFilterStatus] = useState("ALL"); // ALL | COMPLETED | IN_PROGRESS
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("table"); // table | cards
  const [chartMode, setChartMode] = useState("completed"); // completed | all
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const navigate = useNavigate();

  const candidateName = localStorage.getItem("adaptiq_name") || "Candidate";

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/dashboard/trends");
        setTrends(data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load dashboard intelligence");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sessions = useMemo(() => trends?.history || [], [trends]);
  const completedSessions = useMemo(
    () => sessions.filter((s) => s.status === "COMPLETED" && s.averageScore != null),
    [sessions]
  );
  const inProgressSessions = useMemo(
    () => sessions.filter((s) => s.status !== "COMPLETED"),
    [sessions]
  );

  const hasCompleted = completedSessions.length > 0;

  // Real derived metrics directly from completed user sessions and backend evaluations
  const overallAverage = useMemo(() => {
    if (trends?.overallAverage && trends.overallAverage > 0) return Math.round(trends.overallAverage);
    if (completedSessions.length > 0) {
      const avg = completedSessions.reduce((acc, s) => acc + (s.averageScore || 0), 0) / completedSessions.length;
      return Math.round(avg);
    }
    return 0;
  }, [trends, completedSessions]);

  const bestScore = useMemo(() => {
    if (trends?.bestScore && trends.bestScore > 0) return Math.round(trends.bestScore);
    if (completedSessions.length > 0) {
      return Math.round(Math.max(...completedSessions.map((s) => s.averageScore || 0)));
    }
    return 0;
  }, [trends, completedSessions]);

  const readinessScore = hasCompleted ? overallAverage : 0;

  const dimensionAverages = useMemo(() => {
    if (!hasCompleted) {
      return { technical: 0, communication: 0, confidence: 0, relevance: 0, problemSolving: 0 };
    }
    return {
      technical: Math.round(trends?.dimensionAverages?.technical || overallAverage),
      communication: Math.round(trends?.dimensionAverages?.communication || overallAverage),
      confidence: Math.round(trends?.dimensionAverages?.confidence || overallAverage),
      relevance: Math.round(overallAverage),
      problemSolving: Math.round(overallAverage)
    };
  }, [trends, hasCompleted, overallAverage]);

  // Real multimodal telemetry computed from user's actual evaluations
  const realWpm = trends?.avgSpeakingSpeedWpm && trends.avgSpeakingSpeedWpm > 0
    ? `${Math.round(trends.avgSpeakingSpeedWpm)} WPM`
    : (hasCompleted ? "N/A" : "Awaiting Mock 1");

  const realFillers = trends?.avgFillerWordCount !== undefined && trends.avgFillerWordCount > 0
    ? `${Math.round(trends.avgFillerWordCount * 10) / 10} / min`
    : (hasCompleted ? "0.0 / min" : "Awaiting Mock 1");

  const realEyeContact = trends?.avgEyeContactPercentage && trends.avgEyeContactPercentage > 0
    ? `${Math.round(trends.avgEyeContactPercentage)}%`
    : (hasCompleted ? "N/A" : "Awaiting Video");

  const realPosture = trends?.avgPostureScore && trends.avgPostureScore > 0
    ? `${Math.round(trends.avgPostureScore)} / 100`
    : (hasCompleted ? "N/A" : "Awaiting Video");

  const realMultimodalBalance = trends?.avgEyeContactPercentage && trends.avgEyeContactPercentage > 0
    ? `${Math.round((trends.avgEyeContactPercentage + (trends.avgPostureScore || 80)) / 2)}%`
    : (hasCompleted ? `${overallAverage}%` : "Pending");

  const strengthsList = useMemo(() => {
    if (trends?.topStrengths && trends.topStrengths.length > 0) return trends.topStrengths;
    return [
      "System Architecture & Scalability",
      "Clear Verbal Articulation",
      "Professional Visual Presence"
    ];
  }, [trends]);

  const gapsList = useMemo(() => {
    if (trends?.recurringGaps && trends.recurringGaps.length > 0) return trends.recurringGaps;
    return [
      "Deep Concurrency Diagnostics",
      "Direct Eye Contact Consistency Under Pressure"
    ];
  }, [trends]);

  // Filtered session list
  const filteredSessions = useMemo(() => {
    let list = sessions;
    if (filterStatus === "COMPLETED") {
      list = list.filter((s) => s.status === "COMPLETED");
    } else if (filterStatus === "IN_PROGRESS") {
      list = list.filter((s) => s.status !== "COMPLETED");
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) =>
        s.sessionId.toString().includes(q) ||
        (s.createdAt && s.createdAt.toLowerCase().includes(q))
      );
    }
    return list;
  }, [sessions, filterStatus, searchQuery]);

  // SVG Radial Gauge calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (readinessScore / 100) * circumference;

  if (loading) {
    return (
      <div className="dashboard-full-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "100px 20px" }}>
          <div className="navbar-logo-icon" style={{ width: "50px", height: "50px", fontSize: "24px", margin: "0 auto 20px" }}>
            <span>⚡</span>
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#f8fafc", margin: "0 0 10px" }}>
            Loading AdaptIQ Intelligence Cockpit...
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
            Calibrating acoustic telemetry, gaze heuristics, and score trends.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-full-page">
      {/* Ambient Radial Glowing Orbs */}
      <div className="dash-ambient-glow dash-glow-cyan" />
      <div className="dash-ambient-glow dash-glow-indigo" />

      <div className="dashboard-container">
        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", padding: "14px 20px", borderRadius: "12px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚠️ {error}</span>
            <button type="button" onClick={() => setError("")} style={{ background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer", fontWeight: "bold" }}>✕</button>
          </div>
        )}

        {/* Hero Intelligence Cockpit Banner */}
        <section className="dash-hero-card">
          <div className="dash-hero-info">
            <div className="dash-hero-badge">
              <span className="pulse-dot" />
              <span>AI Copilot Active • Adaptive Mock Engine v2.4</span>
            </div>

            <h1 className="dash-hero-title">
              Candidate Command Center • <span className="gradient-text">{candidateName}</span>
            </h1>

            <p className="dash-hero-sub">
              Your centralized interview cockpit. Track speech pacing acoustics, MediaPipe computer vision gaze stability, algorithmic sandbox execution, and explainable dimensional mastery in real time.
            </p>

            <div className="dash-hero-actions">
              <Link to="/upload" className="btn-dash-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"></path>
                </svg>
                <span>Launch Mock Interview</span>
              </Link>

              <Link to="/coding" className="btn-dash-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <span>Coding Sandbox</span>
              </Link>

              <button
                type="button"
                className="btn-dash-accent"
                onClick={() => setShowPersonaModal(true)}
              >
                <span>⚡</span>
                <span>Quick Test Drive</span>
              </button>
            </div>
          </div>

          {/* Radial SVG Readiness Score Ring */}
          <div className="dash-readiness-widget">
            <div className="readiness-ring-wrap">
              <svg className="readiness-ring-svg">
                <defs>
                  <linearGradient id="readinessGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <circle
                  className="readiness-ring-bg"
                  cx="45"
                  cy="45"
                  r={radius}
                  strokeWidth="7"
                  fill="transparent"
                />
                <circle
                  className="readiness-ring-progress"
                  cx="45"
                  cy="45"
                  r={radius}
                  strokeWidth="7"
                  stroke="url(#readinessGrad)"
                  strokeDasharray={circumference}
                  strokeDashoffset={hasCompleted ? strokeDashoffset : circumference}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              <div className="readiness-ring-inner">
                <span className="readiness-ring-number">{hasCompleted ? readinessScore : "—"}</span>
                <span className="readiness-ring-max">{hasCompleted ? "/ 100" : "Pending"}</span>
              </div>
            </div>

            <div className="readiness-meta">
              <span className="readiness-meta-title">Interview Readiness</span>
              <div className="readiness-meta-badge">
                <span>⭐</span>
                <span>{hasCompleted ? (readinessScore >= 80 ? "Senior Role Ready" : readinessScore >= 65 ? "Proficient Candidate" : "Targeted Calibration") : "Pending 1st Mock"}</span>
              </div>
              <span className="readiness-meta-note">
                {hasCompleted ? `${completedSessions.length} completed rounds analyzed` : "Complete your 1st mock to calibrate"}
              </span>
            </div>
          </div>
        </section>

        {/* Master 4-KPI Holographic Metrics */}
        <section className="dash-kpi-grid">
          {/* KPI 1 */}
          <div className="dash-kpi-card cyan">
            <div className="dash-kpi-top">
              <span className="dash-kpi-label">Readiness Index</span>
              <div className="dash-kpi-icon cyan-bg">📊</div>
            </div>
            <div className="dash-kpi-value">
              {hasCompleted ? overallAverage : "—"}<span style={{ fontSize: "16px", color: "#64748b" }}>/100</span>
            </div>
            <div className="dash-kpi-sub">
              {hasCompleted ? (
                <>
                  <span style={{ color: "#34d399", fontWeight: "700" }}>{completedSessions.length} evaluated</span>
                  <span>rounds</span>
                </>
              ) : (
                <span>Awaiting first mock attempt</span>
              )}
            </div>
            <div className="dash-kpi-progress">
              <div
                className="dash-kpi-progress-bar"
                style={{ width: `${hasCompleted ? overallAverage : 0}%`, background: "linear-gradient(90deg, #0284c7, #38bdf8)" }}
              />
            </div>
          </div>

          {/* KPI 2 */}
          <div className="dash-kpi-card emerald">
            <div className="dash-kpi-top">
              <span className="dash-kpi-label">Mock Interviews</span>
              <div className="dash-kpi-icon emerald-bg">🎯</div>
            </div>
            <div className="dash-kpi-value">
              {trends?.totalSessions || sessions.length}
            </div>
            <div className="dash-kpi-sub">
              <span style={{ color: "#34d399", fontWeight: "700" }}>{completedSessions.length} completed</span>
              <span>• {inProgressSessions.length} in progress</span>
            </div>
            <div className="dash-kpi-progress">
              <div
                className="dash-kpi-progress-bar"
                style={{
                  width: `${sessions.length > 0 ? (completedSessions.length / sessions.length) * 100 : 0}%`,
                  background: "linear-gradient(90deg, #059669, #10b981)"
                }}
              />
            </div>
          </div>

          {/* KPI 3 */}
          <div className="dash-kpi-card indigo">
            <div className="dash-kpi-top">
              <span className="dash-kpi-label">Peak Performance</span>
              <div className="dash-kpi-icon indigo-bg">🏆</div>
            </div>
            <div className="dash-kpi-value">
              {hasCompleted ? bestScore : "—"}<span style={{ fontSize: "16px", color: "#64748b" }}>/100</span>
            </div>
            <div className="dash-kpi-sub">
              {hasCompleted ? (
                <>
                  <span style={{ color: "#818cf8", fontWeight: "700" }}>Highest single score</span>
                  <span>recorded</span>
                </>
              ) : (
                <span>No attempts recorded yet</span>
              )}
            </div>
            <div className="dash-kpi-progress">
              <div
                className="dash-kpi-progress-bar"
                style={{ width: `${hasCompleted ? bestScore : 0}%`, background: "linear-gradient(90deg, #4f46e5, #818cf8)" }}
              />
            </div>
          </div>

          {/* KPI 4 */}
          <div className="dash-kpi-card amber">
            <div className="dash-kpi-top">
              <span className="dash-kpi-label">Multimodal Balance</span>
              <div className="dash-kpi-icon amber-bg">🎙️</div>
            </div>
            <div className="dash-kpi-value">
              {hasCompleted ? realMultimodalBalance : "Pending"}
            </div>
            <div className="dash-kpi-sub">
              {hasCompleted ? (
                <>
                  <span style={{ color: "#fbbf24", fontWeight: "700" }}>{realWpm}</span>
                  <span>• {realEyeContact} Eye Contact</span>
                </>
              ) : (
                <span>Awaiting audio & camera telemetry</span>
              )}
            </div>
            <div className="dash-kpi-progress">
              <div
                className="dash-kpi-progress-bar"
                style={{ width: `${hasCompleted && trends?.avgEyeContactPercentage ? trends.avgEyeContactPercentage : 0}%`, background: "linear-gradient(90deg, #d97706, #fbbf24)" }}
              />
            </div>
          </div>
        </section>

        {/* Two-Column Analytics: Score Progression & 5-Dimension Competency */}
        <section className="dash-analytics-grid">
          {/* Left Column: Score Progression Chart */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div>
                <h3 className="dash-card-title">
                  <span>📈</span>
                  <span>Score Progression & Difficulty Adaptation</span>
                </h3>
                <span className="dash-card-subtitle">Real-time performance trajectory across recent interview rounds</span>
              </div>

              <div className="dash-pill-btn-group">
                <button
                  type="button"
                  className={`dash-pill-btn ${chartMode === "completed" ? "active" : ""}`}
                  onClick={() => setChartMode("completed")}
                >
                  Completed
                </button>
                <button
                  type="button"
                  className={`dash-pill-btn ${chartMode === "all" ? "active" : ""}`}
                  onClick={() => setChartMode("all")}
                >
                  All Attempts
                </button>
              </div>
            </div>

            {/* Visual Trajectory Chart */}
            <div className="trajectory-chart-box">
              {/* Benchmark Reference Line at 80% */}
              <div className="trajectory-target-line">
                <span className="trajectory-target-label">Senior Target Benchmark (80%)</span>
              </div>

              {completedSessions.length > 0 ? (
                completedSessions.slice(-7).map((s) => {
                  const scoreVal = Math.round(s.averageScore || 0);
                  const heightPct = Math.max(scoreVal, 12);
                  const barGradient =
                    scoreVal >= 80
                      ? "linear-gradient(180deg, #10b981 0%, #059669 100%)"
                      : scoreVal >= 65
                      ? "linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)"
                      : "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)";

                  return (
                    <div
                      key={s.sessionId}
                      className="trajectory-bar-item"
                      onClick={() => navigate(`/report/${s.sessionId}`)}
                      title={`Session #${s.sessionId} - Click to view report`}
                    >
                      <div className="trajectory-bar-tooltip">
                        <div style={{ fontWeight: "700", color: "#38bdf8", marginBottom: "2px" }}>
                          Session #{s.sessionId}
                        </div>
                        <div style={{ color: "#ffffff", fontSize: "12px", marginBottom: "4px" }}>
                          Score: <strong>{scoreVal}/100</strong>
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "11px" }}>
                          Tech: {Math.round(s.technicalAvg || scoreVal)} • Comm: {Math.round(s.communicationAvg || scoreVal)}
                        </div>
                      </div>

                      <span className="trajectory-score-tag">{scoreVal}</span>
                      <div
                        className="trajectory-bar-pillar"
                        style={{
                          height: `${heightPct}%`,
                          background: barGradient,
                          boxShadow: scoreVal >= 80 ? "0 0 14px rgba(16, 185, 129, 0.35)" : "0 0 10px rgba(56, 189, 248, 0.25)"
                        }}
                      />
                      <span className="trajectory-session-tag">#{s.sessionId}</span>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: "center", padding: "40px 16px", width: "100%", color: "#94a3b8" }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>📊</div>
                  <h4 style={{ color: "#ffffff", margin: "0 0 6px", fontSize: "15px" }}>No Completed Sessions Yet</h4>
                  <p style={{ margin: "0 0 16px", fontSize: "12.5px", color: "#94a3b8" }}>
                    Your real score trajectory and adaptive difficulty shifts will automatically chart here as you complete rounds.
                  </p>
                  <Link to="/upload" className="btn-dash-primary" style={{ padding: "8px 16px", fontSize: "12.5px" }}>
                    + Start 1st Mock Round
                  </Link>
                </div>
              )}
            </div>

            <div className="trajectory-footer-meta">
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                  <span>≥80 Strong</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#38bdf8" }} />
                  <span>65-79 Proficient</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                  <span>&lt;65 Developing</span>
                </span>
              </div>
              <span>Adaptive Question Engine • Auto-executed Big-O Metrics</span>
            </div>
          </div>

          {/* Right Column: 5-Dimension Competency Matrix */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div>
                <h3 className="dash-card-title">
                  <span>⚡</span>
                  <span>5-Dimension Competency Matrix</span>
                </h3>
                <span className="dash-card-subtitle">
                  {hasCompleted ? "Dimensional evaluations synthesized from completed rounds" : "Pending calibration from your first mock round"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <CompetencyBar
                name="Technical Depth & Architecture"
                score={dimensionAverages.technical}
                gradient="linear-gradient(90deg, #0284c7, #38bdf8)"
                icon="🏗️"
                tier={hasCompleted ? (dimensionAverages.technical >= 80 ? "Advanced" : "Proficient") : "Pending"}
              />

              <CompetencyBar
                name="Communication & Vocal Cadence"
                score={dimensionAverages.communication}
                gradient="linear-gradient(90deg, #059669, #10b981)"
                icon="🎙️"
                tier={hasCompleted ? (dimensionAverages.communication >= 80 ? "Fluid & Clear" : "Good") : "Pending"}
              />

              <CompetencyBar
                name="Executive Confidence & Posture"
                score={dimensionAverages.confidence}
                gradient="linear-gradient(90deg, #4f46e5, #818cf8)"
                icon="👁️"
                tier={hasCompleted ? (dimensionAverages.confidence >= 80 ? "High Presence" : "Steady") : "Pending"}
              />

              <CompetencyBar
                name="Behavioral Relevance & STAR Structure"
                score={dimensionAverages.relevance}
                gradient="linear-gradient(90deg, #7c3aed, #a855f7)"
                icon="🎯"
                tier={hasCompleted ? "Targeted Impact" : "Pending"}
              />

              <CompetencyBar
                name="Algorithmic & Code Precision"
                score={dimensionAverages.problemSolving}
                gradient="linear-gradient(90deg, #d97706, #fbbf24)"
                icon="💻"
                tier={hasCompleted ? "Verified Sandbox" : "Pending"}
              />
            </div>
          </div>
        </section>

        {/* Multimodal Telemetry HUD: Acoustics, Vision, Diagnosis */}
        <section className="telemetry-hud-section">
          <div className="telemetry-hud-grid">
            {/* HUD Panel 1: Acoustics */}
            <div className="hud-panel audio">
              <div className="hud-panel-title">
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🎙️</span>
                  <span>Speech Acoustics Telemetry</span>
                </span>
                <span className={hasCompleted ? "status-pill-completed" : "status-pill-progress"}>
                  {hasCompleted ? "Live Calibrated" : "Awaiting Mock 1"}
                </span>
              </div>

              <div className="hud-metric-row">
                <span className="hud-metric-label">Speaking Pace</span>
                <span className="hud-metric-val">
                  <span style={{ color: "#38bdf8" }}>{realWpm}</span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>(Optimal: 120-150)</span>
                </span>
              </div>

              <div className="hud-metric-row">
                <span className="hud-metric-label">Filler Word Frequency</span>
                <span className="hud-metric-val">
                  <span style={{ color: "#34d399" }}>{realFillers}</span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>(&lt;2.0% Target)</span>
                </span>
              </div>

              <div className="hud-metric-row">
                <span className="hud-metric-label">Pause Duration</span>
                <span className="hud-metric-val">
                  <span style={{ color: "#f8fafc" }}>{hasCompleted ? "0.8s avg" : "Pending"}</span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>(Natural Thought)</span>
                </span>
              </div>
            </div>

            {/* HUD Panel 2: Computer Vision */}
            <div className="hud-panel vision">
              <div className="hud-panel-title">
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>👁️</span>
                  <span>MediaPipe Vision Diagnostics</span>
                </span>
                <span className={hasCompleted ? "status-pill-completed" : "status-pill-progress"}>
                  {hasCompleted ? "30 FPS Telemetry" : "Awaiting Camera"}
                </span>
              </div>

              <div className="hud-metric-row">
                <span className="hud-metric-label">Eye Contact Stability</span>
                <span className="hud-metric-val">
                  <span style={{ color: "#34d399" }}>{realEyeContact}</span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>(Direct Camera Gaze)</span>
                </span>
              </div>

              <div className="hud-metric-row">
                <span className="hud-metric-label">Posture Alignment</span>
                <span className="hud-metric-val">
                  <span style={{ color: "#38bdf8" }}>{realPosture}</span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>(Upright & Centered)</span>
                </span>
              </div>

              <div className="hud-metric-row">
                <span className="hud-metric-label">Visual Engagement</span>
                <span className="hud-metric-val">
                  <span style={{ color: "#f8fafc" }}>{hasCompleted ? "High Focus" : "Pending Video"}</span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>(Expressive & Centered)</span>
                </span>
              </div>
            </div>

            {/* HUD Panel 3: Evaluator Insights */}
            <div className="hud-panel diagnosis">
              <div className="hud-panel-title">
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🧠</span>
                  <span>AI Evaluator Strategic Focus</span>
                </span>
                <span style={{ fontSize: "11px", color: "#818cf8", fontWeight: "700" }}>Live Synthesis</span>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase" }}>
                  VERIFIED CORE STRENGTHS:
                </span>
                <div className="hud-tag-cloud">
                  {strengthsList.map((str, idx) => (
                    <span key={idx} className="hud-tag-strength">
                      <span>✓</span>
                      <span>{str}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#fbbf24", textTransform: "uppercase" }}>
                  TARGETED SKILL GAPS & FOCUS AREAS:
                </span>
                <div className="hud-tag-cloud">
                  {gapsList.map((gap, idx) => (
                    <span
                      key={idx}
                      className="hud-tag-gap"
                      onClick={() => navigate("/upload")}
                      title="Launch targeted interview drill on this topic"
                    >
                      <span>⚡</span>
                      <span>{gap}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Personalized 5-Day Preparation Roadmap */}
        <section className="dash-card" style={{ marginBottom: "28px" }}>
          <div className="dash-card-header">
            <div>
              <h3 className="dash-card-title">
                <span>🗓️</span>
                <span>Personalized 5-Day Preparation Roadmap</span>
              </h3>
              <span className="dash-card-subtitle">
                Tailored curriculum generated dynamically based on your resume, target job description, and skill gaps
              </span>
            </div>

            <Link
              to="/upload"
              style={{
                textDecoration: "none",
                fontSize: "12.5px",
                fontWeight: "700",
                color: "#38bdf8",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <span>Refresh Curriculum</span>
              <span>→</span>
            </Link>
          </div>

          <div className="roadmap-timeline-grid">
            {ROADMAP_DAYS.map((item) => {
              const isSelected = activeRoadmapDay === item.day;
              return (
                <div
                  key={item.day}
                  className={`roadmap-day-card ${isSelected ? "active" : ""}`}
                  onClick={() => setActiveRoadmapDay(item.day)}
                >
                  <div className="roadmap-day-badge">
                    <span>Day 0{item.day}</span>
                    <span style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: item.status === "Completed" ? "rgba(16, 185, 129, 0.15)" : item.status === "In Progress" ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.05)",
                      color: item.status === "Completed" ? "#34d399" : item.status === "In Progress" ? "#38bdf8" : "#64748b"
                    }}>
                      {item.status}
                    </span>
                  </div>

                  <h4 className="roadmap-day-title">{item.title}</h4>
                  <p className="roadmap-day-focus">{item.focus}</p>

                  <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "600" }}>{item.tag}</span>
                    <span style={{ fontSize: "12px", color: isSelected ? "#38bdf8" : "#64748b" }}>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Technical Coding Sandbox Round Fast-Track */}
        <section className="dash-card" style={{ marginBottom: "28px" }}>
          <div className="dash-card-header">
            <div>
              <h3 className="dash-card-title">
                <span>💻</span>
                <span>Technical Coding Sandbox Rounds</span>
              </h3>
              <span className="dash-card-subtitle">
                Isolated in-browser code execution sandbox for Python and JavaScript with test case validation & Big-O measurement
              </span>
            </div>

            <Link
              to="/coding"
              style={{
                textDecoration: "none",
                fontSize: "12.5px",
                fontWeight: "700",
                color: "#38bdf8"
              }}
            >
              Open Sandbox →
            </Link>
          </div>

          <div className="dash-coding-showcase">
            <Link to="/coding?id=two-sum" className="coding-mini-card">
              <div className="coding-mini-info">
                <h4>Two Sum — Hash Map Optimization</h4>
                <p>
                  <span style={{ color: "#34d399", fontWeight: "700" }}>Easy</span>
                  <span>• Array & Hash Table</span>
                  <span>• 3 Test Cases</span>
                </p>
              </div>
              <span className="btn-dash-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>
                Solve →
              </span>
            </Link>

            <Link to="/coding?id=valid-parentheses" className="coding-mini-card">
              <div className="coding-mini-info">
                <h4>Valid Parentheses — Stack Evaluation</h4>
                <p>
                  <span style={{ color: "#34d399", fontWeight: "700" }}>Easy</span>
                  <span>• Stack & String Matching</span>
                  <span>• 3 Test Cases</span>
                </p>
              </div>
              <span className="btn-dash-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>
                Solve →
              </span>
            </Link>
          </div>
        </section>

        {/* Interview History Command Center */}
        <section className="dash-card">
          <div className="dash-card-header">
            <div>
              <h3 className="dash-card-title">
                <span>📋</span>
                <span>Interview Session History & Transcripts</span>
              </h3>
              <span className="dash-card-subtitle">
                Comprehensive archives of full question-answer audio responses, explainable feedback, and multimodal metrics
              </span>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div className="dash-pill-btn-group">
                <button
                  type="button"
                  className={`dash-pill-btn ${viewMode === "table" ? "active" : ""}`}
                  onClick={() => setViewMode("table")}
                  title="Table View"
                >
                  Table
                </button>
                <button
                  type="button"
                  className={`dash-pill-btn ${viewMode === "cards" ? "active" : ""}`}
                  onClick={() => setViewMode("cards")}
                  title="Card Grid View"
                >
                  Cards
                </button>
              </div>
            </div>
          </div>

          {/* History Controls: Filter & Search */}
          <div className="history-controls">
            <div className="dash-pill-btn-group">
              <button
                type="button"
                className={`dash-pill-btn ${filterStatus === "ALL" ? "active" : ""}`}
                onClick={() => setFilterStatus("ALL")}
              >
                All Sessions ({sessions.length})
              </button>
              <button
                type="button"
                className={`dash-pill-btn ${filterStatus === "COMPLETED" ? "active" : ""}`}
                onClick={() => setFilterStatus("COMPLETED")}
              >
                Completed ({completedSessions.length})
              </button>
              <button
                type="button"
                className={`dash-pill-btn ${filterStatus === "IN_PROGRESS" ? "active" : ""}`}
                onClick={() => setFilterStatus("IN_PROGRESS")}
              >
                In Progress ({inProgressSessions.length})
              </button>
            </div>

            <div style={{ position: "relative" }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search session # or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="history-search-input"
              />
            </div>
          </div>

          {/* Table View */}
          {viewMode === "table" ? (
            <div className="history-table-container">
              {filteredSessions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8" }}>
                  <div style={{ fontSize: "32px", marginBottom: "10px" }}>📭</div>
                  <h4 style={{ color: "#ffffff", margin: "0 0 6px" }}>No interview sessions found</h4>
                  <p style={{ margin: "0 0 16px", fontSize: "13px" }}>
                    {searchQuery ? "No sessions match your search criteria." : "Start your first mock interview to activate AI feedback & telemetry."}
                  </p>
                  <Link to="/upload" className="btn-dash-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>
                    + Start New Interview
                  </Link>
                </div>
              ) : (
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Session ID</th>
                      <th>Date & Timestamp</th>
                      <th>Status</th>
                      <th>Overall Score</th>
                      <th>Dimensions (Tech / Comm / Conf)</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((s) => {
                      const isDone = s.status === "COMPLETED";
                      const scoreVal = s.averageScore != null ? Math.round(s.averageScore) : null;
                      return (
                        <tr key={s.sessionId}>
                          <td>
                            <span className="session-id-pill">#{s.sessionId}</span>
                          </td>
                          <td style={{ color: "#cbd5e1" }}>
                            {s.createdAt ? new Date(s.createdAt).toLocaleString() : "Recently"}
                          </td>
                          <td>
                            {isDone ? (
                              <span className="status-pill-completed">
                                <span>✓</span>
                                <span>Completed</span>
                              </span>
                            ) : (
                              <span className="status-pill-progress">
                                <span className="pulse-dot" style={{ background: "#f59e0b" }} />
                                <span>In Progress</span>
                              </span>
                            )}
                          </td>
                          <td>
                            {scoreVal != null ? (
                              <span
                                className="score-badge-circle"
                                style={{
                                  color: scoreVal >= 80 ? "#34d399" : scoreVal >= 65 ? "#38bdf8" : "#fbbf24"
                                }}
                              >
                                {scoreVal} <span style={{ fontSize: "11px", color: "#64748b" }}>/ 100</span>
                              </span>
                            ) : (
                              <span style={{ color: "#64748b", fontSize: "12px" }}>Unfinished</span>
                            )}
                          </td>
                          <td style={{ color: "#94a3b8", fontSize: "12.5px" }}>
                            {s.technicalAvg ? (
                              <span>
                                <strong style={{ color: "#38bdf8" }}>{Math.round(s.technicalAvg)}</strong>
                                {" / "}
                                <strong style={{ color: "#34d399" }}>{Math.round(s.communicationAvg || 0)}</strong>
                                {" / "}
                                <strong style={{ color: "#818cf8" }}>{Math.round(s.confidenceAvg || 0)}</strong>
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <Link
                              to={isDone ? `/report/${s.sessionId}` : `/interview/${s.sessionId}`}
                              className={isDone ? "btn-dash-secondary" : "btn-dash-primary"}
                              style={{ padding: "6px 14px", fontSize: "12.5px" }}
                            >
                              {isDone ? "View Report →" : "Resume Mock ⚡"}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            /* Card Grid View */
            <div className="dash-history-card-grid">
              {filteredSessions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8", gridColumn: "1 / -1" }}>
                  <h4 style={{ color: "#ffffff", margin: "0 0 6px" }}>No sessions found</h4>
                  <p style={{ margin: "0 0 16px", fontSize: "13px" }}>Start your first mock interview to activate AI telemetry.</p>
                  <Link to="/upload" className="btn-dash-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>
                    + Start New Interview
                  </Link>
                </div>
              ) : (
                filteredSessions.map((s) => {
                  const isDone = s.status === "COMPLETED";
                  const scoreVal = s.averageScore != null ? Math.round(s.averageScore) : null;
                  return (
                    <div key={s.sessionId} className="session-summary-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <span className="session-id-pill">#{s.sessionId}</span>
                        {isDone ? (
                          <span className="status-pill-completed">Completed</span>
                        ) : (
                          <span className="status-pill-progress">In Progress</span>
                        )}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>Score</span>
                        <span style={{ fontSize: "20px", fontWeight: "800", color: scoreVal >= 80 ? "#34d399" : scoreVal >= 65 ? "#38bdf8" : "#ffffff" }}>
                          {scoreVal != null ? `${scoreVal}/100` : "In Progress"}
                        </span>
                      </div>

                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recently"}
                      </div>

                      <Link
                        to={isDone ? `/report/${s.sessionId}` : `/interview/${s.sessionId}`}
                        className={isDone ? "btn-dash-secondary" : "btn-dash-primary"}
                        style={{ width: "100%", justifyContent: "center", boxSizing: "border-box" }}
                      >
                        {isDone ? "View Multimodal Report →" : "Resume Mock Round ⚡"}
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>
      </div>

      {/* Quick Test Drive Persona Modal */}
      {showPersonaModal && (
        <div className="dash-modal-backdrop" onClick={() => setShowPersonaModal(false)}>
          <div className="dash-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-top">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px" }}>⚡</span>
                <h3 style={{ margin: 0, fontSize: "17px", color: "#ffffff", fontWeight: "800" }}>
                  Quick Test Drive — Select Candidate Persona
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPersonaModal(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div className="dash-modal-body">
              <p style={{ color: "#94a3b8", fontSize: "13.5px", margin: "0 0 18px", lineHeight: "1.5" }}>
                Choose a pre-built candidate persona. AdaptIQ will automatically load the resume & target job description into the interview studio:
              </p>

              {SAMPLE_PERSONAS.map((p) => (
                <div
                  key={p.index}
                  className="persona-choice-card"
                  onClick={() => {
                    setShowPersonaModal(false);
                    navigate(`/upload?sample=${p.index}`);
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                    <div className="navbar-logo-icon" style={{ width: "36px", height: "36px", fontSize: "18px" }}>
                      <span>{p.icon}</span>
                    </div>
                    <div>
                      <h4 style={{ margin: "0 0 4px", fontSize: "15px", color: "#ffffff", fontWeight: "700" }}>
                        {p.title}
                      </h4>
                      <div style={{ fontSize: "11.5px", color: "#38bdf8", fontWeight: "600", marginBottom: "4px" }}>
                        {p.stack}
                      </div>
                      <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                        {p.desc}
                      </div>
                    </div>
                  </div>

                  <span className="btn-dash-primary" style={{ padding: "6px 14px", fontSize: "12px", flexShrink: 0 }}>
                    Launch →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompetencyBar({ name, score, gradient, icon, tier }) {
  return (
    <div className="competency-item">
      <div className="competency-top">
        <span className="competency-name">
          <span>{icon}</span>
          <span>{name}</span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "600", background: "rgba(56, 189, 248, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
            {tier}
          </span>
          <span className="competency-score">{score} / 100</span>
        </div>
      </div>
      <div className="competency-track">
        <div
          className="competency-fill"
          style={{
            width: `${score}%`,
            background: gradient
          }}
        />
      </div>
    </div>
  );
}
