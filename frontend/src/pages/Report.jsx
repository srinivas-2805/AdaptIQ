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

  return (
    <div className="page report-page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1>Multimodal Interview Evaluation Report</h1>
          <p className="muted">Session #{sessionId} • Comprehensive performance breakdown & explainable feedback</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
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

      {/* Skill-Gap Analysis Card */}
      <div className="card" style={{ borderLeft: "4px solid #f59e0b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <span style={{ fontSize: "20px" }}>🎯</span>
          <h3 style={{ margin: 0 }}>Skill-Gap & Strengths Analysis</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
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

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <Link to="/upload" style={{ textDecoration: "none", padding: "14px 32px", background: "#2563eb", color: "white", borderRadius: "8px", fontWeight: "700", fontSize: "16px" }}>
          🚀 Start Another Mock Interview
        </Link>
      </div>
    </div>
  );
}
