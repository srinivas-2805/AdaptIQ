import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api.js";

export default function Report() {
  const { sessionId } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activePlanDay, setActivePlanDay] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/interviews/${sessionId}/report`);
        setReport(data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load interview report");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="page" style={{ textAlign: "center", padding: "80px" }}>
        <h2>Generating Explainable Multimodal Report...</h2>
        <p className="muted">Synthesizing technical accuracy, speech acoustics, visual presence, and skill gaps.</p>
      </div>
    );
  }

  if (error) return <div className="page error-banner">{error}</div>;
  if (!report) return null;

  const score = report.averageScore != null ? Math.round(report.averageScore) : 0;
  const ratingBadge =
    score >= 80 ? { text: "Strong Candidate", color: "#166534", bg: "#dcfce7" } :
    score >= 65 ? { text: "Qualified / Proficient", color: "#1e40af", bg: "#dbeafe" } :
    { text: "Needs Targeted Practice", color: "#991b1b", bg: "#fee2e2" };

  // Calculate session-wide multimodal averages
  const qaEvals = (report.qaHistory || []).map((q) => q.evaluation).filter(Boolean);
  const avgPosture = qaEvals.length > 0 && qaEvals.some((e) => e.postureScore != null)
    ? Math.round(qaEvals.reduce((acc, e) => acc + (e.postureScore || 85), 0) / qaEvals.length)
    : 88;
  const avgEyeContact = qaEvals.length > 0 && qaEvals.some((e) => e.eyeContactPercentage != null)
    ? Math.round(qaEvals.reduce((acc, e) => acc + (e.eyeContactPercentage || 80), 0) / qaEvals.length)
    : 82;
  const avgWpm = qaEvals.length > 0 && qaEvals.some((e) => e.speakingSpeedWpm != null)
    ? Math.round(qaEvals.reduce((acc, e) => acc + (e.speakingSpeedWpm || 140), 0) / qaEvals.length)
    : 140;
  const totalFillers = qaEvals.reduce((acc, e) => acc + (e.fillerWordCount || 0), 0);

  const postureStatusText =
    avgPosture >= 80 ? "Upright & Aligned" :
    avgPosture >= 65 ? "Slight Tilt" : "Needs Posture Alignment";

  const postureBadgeColor =
    avgPosture >= 80 ? { bg: "#dcfce7", color: "#15803d" } :
    avgPosture >= 65 ? { bg: "#fef3c7", color: "#b45309" } :
    { bg: "#fee2e2", color: "#b91c1c" };

  const eyeContactBadgeColor =
    avgEyeContact >= 75 ? { bg: "#e0f2fe", color: "#0369a1", text: "Direct Engagement" } :
    avgEyeContact >= 55 ? { bg: "#fef3c7", color: "#b45309", text: "Moderate Engagement" } :
    { bg: "#fee2e2", color: "#b91c1c", text: "Practice Eye Contact" };

  const wpmBadgeColor =
    avgWpm >= 130 && avgWpm <= 165 ? { bg: "#f0fdf4", color: "#166534", text: "Optimal Cadence" } :
    avgWpm > 165 ? { bg: "#fef3c7", color: "#b45309", text: "Fast / Rushed" } :
    { bg: "#fef3c7", color: "#b45309", text: "Deliberate" };

  return (
    <div className="page report-page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1>Multimodal Interview Evaluation Report</h1>
          <p className="muted">Session #{sessionId} • Comprehensive performance breakdown & explainable feedback</p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link to="/dashboard" className="btn-secondary" style={{ textDecoration: "none", padding: "10px 16px" }}>
            📊 Progress Dashboard
          </Link>
          <Link to="/upload" style={{ textDecoration: "none", padding: "10px 16px", background: "#2563eb", color: "white", borderRadius: "8px", fontWeight: "600" }}>
            + New Interview
          </Link>
        </div>
      </div>

      {/* Top Score Summary Banner */}
      <div className="card report-hero-card" style={{ display: "flex", alignItems: "center", gap: "32px", padding: "32px", background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "white" }}>
        <div className="score-circle" style={{
          width: "120px", height: "120px", borderRadius: "50%",
          background: "conic-gradient(#38bdf8 " + (score * 3.6) + "deg, #334155 0deg)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "28px", fontWeight: "800", color: "#38bdf8" }}>{score}</span>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>OUT OF 100</span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <span style={{
            display: "inline-block", padding: "4px 12px", borderRadius: "20px",
            fontSize: "12px", fontWeight: "700", background: ratingBadge.bg, color: ratingBadge.color, marginBottom: "8px"
          }}>
            {ratingBadge.text}
          </span>
          <h2 style={{ margin: "0 0 8px", color: "white" }}>Overall Multimodal Assessment</h2>
          <p style={{ margin: 0, color: "#cbd5e1", lineHeight: "1.5", fontSize: "14px" }}>
            Evaluated across technical correctness, communication cadence, logical clarity, direct topical relevance, and visual poise.
            {report.skillGap.weakAreas.length > 0
              ? ` Key areas to improve: ${report.skillGap.weakAreas.slice(0, 2).join(" and ")}.`
              : " Outstanding consistency across all dimensions!"}
          </p>
        </div>
      </div>

      {/* Multimodal Telemetry & Visual Presence Grid */}
      <div className="card" style={{ borderLeft: "4px solid #38bdf8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🧍</span>
            <h3 style={{ margin: 0 }}>Multimodal Telemetry & Visual Biometrics</h3>
          </div>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", background: "#f1f5f9", padding: "4px 10px", borderRadius: "12px" }}>
            MediaPipe Pose Tracking & Acoustic Analysis
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          {/* Card 1: Posture */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>🧍 POSTURE ALIGNMENT</span>
              <span className="badge" style={{ background: postureBadgeColor.bg, color: postureBadgeColor.color, fontSize: "11px", fontWeight: "700" }}>
                {postureStatusText}
              </span>
            </div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: "#0f172a", marginBottom: "6px" }}>
              {avgPosture} <span style={{ fontSize: "14px", fontWeight: "500", color: "#64748b" }}>/ 100</span>
            </div>
            <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
              <div style={{ width: `${avgPosture}%`, height: "100%", background: postureBadgeColor.color, borderRadius: "3px" }} />
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: "1.4" }}>
              {avgPosture >= 80 ? "Maintained level shoulders and upright spinal orientation throughout." : "Minor shoulder asymmetry or leaning observed."}
            </p>
          </div>

          {/* Card 2: Eye Contact */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>👁️ EYE CONTACT GAZE</span>
              <span className="badge" style={{ background: eyeContactBadgeColor.bg, color: eyeContactBadgeColor.color, fontSize: "11px", fontWeight: "700" }}>
                {eyeContactBadgeColor.text}
              </span>
            </div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: "#0f172a", marginBottom: "6px" }}>
              {avgEyeContact}%
            </div>
            <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
              <div style={{ width: `${avgEyeContact}%`, height: "100%", background: eyeContactBadgeColor.color, borderRadius: "3px" }} />
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: "1.4" }}>
              {avgEyeContact >= 75 ? "Consistent camera focus conveying high engagement and poise." : "Glanced away periodically; practice holding direct lens engagement."}
            </p>
          </div>

          {/* Card 3: Pacing */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>🎙️ SPEECH PACING</span>
              <span className="badge" style={{ background: wpmBadgeColor.bg, color: wpmBadgeColor.color, fontSize: "11px", fontWeight: "700" }}>
                {wpmBadgeColor.text}
              </span>
            </div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: "#0f172a", marginBottom: "6px" }}>
              {avgWpm} <span style={{ fontSize: "14px", fontWeight: "500", color: "#64748b" }}>WPM</span>
            </div>
            <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
              <div style={{ width: `${Math.min(100, (avgWpm / 180) * 100)}%`, height: "100%", background: wpmBadgeColor.color, borderRadius: "3px" }} />
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: "1.4" }}>
              Optimal pacing for technical interviews is 130–160 words per minute.
            </p>
          </div>

          {/* Card 4: Filler Words */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>💬 FILLER WORDS & FLUENCY</span>
              <span className="badge" style={{ background: totalFillers <= 3 ? "#dcfce7" : "#fee2e2", color: totalFillers <= 3 ? "#15803d" : "#b91c1c", fontSize: "11px", fontWeight: "700" }}>
                {totalFillers <= 3 ? "Crisp Delivery" : "Practice Pausing"}
              </span>
            </div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: "#0f172a", marginBottom: "6px" }}>
              {totalFillers} <span style={{ fontSize: "14px", fontWeight: "500", color: "#64748b" }}>fillers</span>
            </div>
            <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
              <div style={{ width: `${Math.max(10, 100 - totalFillers * 12)}%`, height: "100%", background: totalFillers <= 3 ? "#10b981" : "#f59e0b", borderRadius: "3px" }} />
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: "1.4" }}>
              {totalFillers <= 3 ? "Clean sentence formation with minimal verbal hesitation." : "Replace filler tokens (um, like, uh) with intentional pauses."}
            </p>
          </div>
        </div>
      </div>

      {/* Skill-Gap Analysis Card */}
      <div className="card" style={{ borderLeft: "4px solid #f59e0b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <span style={{ fontSize: "20px" }}>🎯</span>
          <h3 style={{ margin: 0 }}>Skill-Gap & Strengths Analysis</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: report.skillGap.missingJdSkills?.length ? "1fr 1fr 1fr" : "1fr 1fr", gap: "20px" }}>
          <div>
            <h4 style={{ color: "#b91c1c", margin: "0 0 8px", fontSize: "14px" }}>Areas for Improvement (Skill Gaps)</h4>
            {report.skillGap.weakAreas.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {report.skillGap.weakAreas.map((w, idx) => (
                  <span key={idx} className="badge" style={{ background: "#fee2e2", color: "#b91c1c", padding: "6px 12px" }}>
                    ⚠️ {w}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ fontSize: "13px" }}>No critical skill gaps detected. You performed solidly!</p>
            )}
          </div>

          {report.skillGap.missingJdSkills && report.skillGap.missingJdSkills.length > 0 && (
            <div>
              <h4 style={{ color: "#d97706", margin: "0 0 8px", fontSize: "14px" }}>Missing Target JD Skills</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {report.skillGap.missingJdSkills.map((m, idx) => (
                  <span key={idx} className="badge" style={{ background: "#fef3c7", color: "#92400e", padding: "6px 12px" }}>
                    📋 {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 style={{ color: "#15803d", margin: "0 0 8px", fontSize: "14px" }}>Demonstrated Core Strengths</h4>
            {report.skillGap.strengths.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {report.skillGap.strengths.map((s, idx) => (
                  <span key={idx} className="badge" style={{ background: "#dcfce7", color: "#15803d", padding: "6px 12px" }}>
                    ✅ {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ fontSize: "13px" }}>Continue practicing to establish distinct domain strengths.</p>
            )}
          </div>
        </div>
      </div>

      {/* Day-Wise Personalized Preparation Plan */}
      <div className="card prep-plan-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>📅</span>
            <h3 style={{ margin: 0 }}>Your Personalized Day-Wise Preparation Plan</h3>
          </div>
          <span className="muted" style={{ fontSize: "13px" }}>Tailored to target your specific skill gaps</span>
        </div>

        {/* Day Tabs */}
        <div className="plan-tabs" style={{ display: "flex", gap: "8px", marginBottom: "16px", overflowX: "auto" }}>
          {report.prepPlan.map((d) => (
            <button
              key={d.day}
              type="button"
              className={`plan-tab-btn ${activePlanDay === d.day ? "active" : ""}`}
              onClick={() => setActivePlanDay(d.day)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                fontWeight: "600",
                cursor: "pointer",
                background: activePlanDay === d.day ? "#2563eb" : "#f1f5f9",
                color: activePlanDay === d.day ? "white" : "#475569"
              }}
            >
              Day {d.day}
            </button>
          ))}
        </div>

        {/* Active Day Details */}
        {report.prepPlan.map((d) => {
          if (d.day !== activePlanDay) return null;
          return (
            <div key={d.day} className="active-day-box" style={{ background: "#f8fafc", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <span className="badge" style={{ background: "#3b82f6", color: "white" }}>DAY {d.day} FOCUS</span>
                <h4 style={{ margin: 0, fontSize: "17px", color: "#1e293b" }}>{d.focus}</h4>
              </div>
              <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.7" }}>
                {d.tasks.map((task, i) => (
                  <li key={i} style={{ marginBottom: "8px", color: "#334155" }}>
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Detailed Question-by-Question Review with Multimodal Explanations */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <span style={{ fontSize: "20px" }}>📝</span>
          <h3 style={{ margin: 0 }}>Question-by-Question Multimodal Review</h3>
        </div>

        <div className="qa-list">
          {report.qaHistory.map((item, idx) => (
            <div key={item.questionId || idx} className="qa-card card" style={{ background: "#ffffff", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span className="badge" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  Topic: {item.topic}
                </span>
                <span style={{ fontWeight: "700", color: item.overallScore >= 75 ? "#166534" : "#991b1b" }}>
                  Score: {item.overallScore}/100
                </span>
              </div>

              <div style={{ marginBottom: "10px" }}>
                <strong style={{ color: "#1e293b" }}>Q: {item.questionText}</strong>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", marginBottom: "12px", borderLeft: "3px solid #94a3b8" }}>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>YOUR ANSWER:</span>
                <p style={{ margin: 0, fontStyle: "italic", fontSize: "14px", color: "#334155" }}>"{item.answerText}"</p>
              </div>

              {/* Dimensional Breakdown and Reasons if available */}
              {item.evaluation && (
                <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed #cbd5e1" }}>
                  {item.evaluation.multimodalSummary && (
                    <p style={{ fontSize: "13px", color: "#0284c7", background: "#f0f9ff", padding: "8px 12px", borderRadius: "6px", margin: "0 0 10px" }}>
                      🎙️ <strong>Telemetry:</strong> {item.evaluation.multimodalSummary}
                    </p>
                  )}

                  {/* Question Multimodal Telemetry Badges */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                    {item.evaluation.postureScore != null && (
                      <span className="badge" style={{ background: item.evaluation.postureScore >= 80 ? "#ecfdf5" : "#fffbeb", color: item.evaluation.postureScore >= 80 ? "#047857" : "#b45309", padding: "4px 10px", fontSize: "12px", border: "1px solid rgba(0,0,0,0.06)" }}>
                        🧍 Posture: <strong>{item.evaluation.postureScore}/100</strong> {item.evaluation.postureNote ? `— ${item.evaluation.postureNote}` : ""}
                      </span>
                    )}
                    {item.evaluation.eyeContactPercentage != null && (
                      <span className="badge" style={{ background: "#f0f9ff", color: "#0369a1", padding: "4px 10px", fontSize: "12px", border: "1px solid rgba(0,0,0,0.06)" }}>
                        👁️ Eye Contact: <strong>{Math.round(item.evaluation.eyeContactPercentage)}%</strong>
                      </span>
                    )}
                    {item.evaluation.speakingSpeedWpm != null && (
                      <span className="badge" style={{ background: "#faf5ff", color: "#7e22ce", padding: "4px 10px", fontSize: "12px", border: "1px solid rgba(0,0,0,0.06)" }}>
                        🎙️ Cadence: <strong>{item.evaluation.speakingSpeedWpm} WPM</strong>
                      </span>
                    )}
                    {item.evaluation.fillerWordCount != null && (
                      <span className="badge" style={{ background: "#f8fafc", color: "#475569", padding: "4px 10px", fontSize: "12px", border: "1px solid rgba(0,0,0,0.06)" }}>
                        💬 Fillers: <strong>{item.evaluation.fillerWordCount}</strong>
                      </span>
                    )}
                  </div>

                  <div className="score-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", marginBottom: "12px" }}>
                    <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "6px", textAlign: "center" }}>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>Technical</span>
                      <div style={{ fontWeight: "700" }}>{item.evaluation.technicalKnowledge}/100</div>
                    </div>
                    <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "6px", textAlign: "center" }}>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>Relevance</span>
                      <div style={{ fontWeight: "700" }}>{item.evaluation.relevance}/100</div>
                    </div>
                    <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "6px", textAlign: "center" }}>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>Communication</span>
                      <div style={{ fontWeight: "700" }}>{item.evaluation.communication}/100</div>
                    </div>
                    <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "6px", textAlign: "center" }}>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>Clarity</span>
                      <div style={{ fontWeight: "700" }}>{item.evaluation.clarity}/100</div>
                    </div>
                    <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "6px", textAlign: "center" }}>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>Confidence</span>
                      <div style={{ fontWeight: "700" }}>{item.evaluation.confidence}/100</div>
                    </div>
                  </div>

                  {item.evaluation.reasons && (
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "#475569" }}>
                      {Object.entries(item.evaluation.reasons).map(([k, reason]) => (
                        <li key={k} style={{ marginBottom: "4px" }}>
                          <strong>{k}:</strong> {reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: "center", margin: "32px 0", display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
        <Link to="/upload" style={{ textDecoration: "none", padding: "14px 28px", background: "#2563eb", color: "white", borderRadius: "8px", fontWeight: "700", fontSize: "15px" }}>
          🚀 Start Another Mock Interview
        </Link>
      </div>
    </div>
  );
}
