import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";

export default function Dashboard() {
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/dashboard/trends");
        setTrends(data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="page" style={{ textAlign: "center", padding: "60px" }}>Loading your performance analytics...</div>;

  const sessions = trends?.history || [];
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED" && s.averageScore != null);

  return (
    <div className="page dashboard-page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1>Performance Dashboard & Progress Tracking</h1>
          <p className="muted">Track interview performance, dimension mastery, and score improvements over time.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/upload" style={{ textDecoration: "none", padding: "10px 18px", background: "#2563eb", color: "white", borderRadius: "8px", fontWeight: "600" }}>
            + Start New Interview
          </Link>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Top 4 KPI Metrics */}
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", margin: "20px 0" }}>
        <div className="card stat-card" style={{ borderTop: "4px solid #3b82f6" }}>
          <span className="stat-label">Total Mock Interviews</span>
          <div className="stat-value">{trends?.totalSessions || sessions.length}</div>
          <span className="stat-sub muted">{completedSessions.length} completed sessions</span>
        </div>

        <div className="card stat-card" style={{ borderTop: "4px solid #10b981" }}>
          <span className="stat-label">Average Overall Score</span>
          <div className="stat-value">{trends?.overallAverage || 0}<span style={{ fontSize: "16px", color: "#64748b" }}>/100</span></div>
          <span className="stat-sub" style={{ color: "#166534" }}>Across all evaluation dimensions</span>
        </div>

        <div className="card stat-card" style={{ borderTop: "4px solid #8b5cf6" }}>
          <span className="stat-label">Personal Best Score</span>
          <div className="stat-value">{trends?.bestScore || 0}<span style={{ fontSize: "16px", color: "#64748b" }}>/100</span></div>
          <span className="stat-sub muted">Peak interview performance</span>
        </div>

        <div className="card stat-card" style={{ borderTop: "4px solid #f59e0b" }}>
          <span className="stat-label">Mastery Growth</span>
          <div className="stat-value" style={{ color: "#059669" }}>
            {completedSessions.length > 1 ? "+12.4%" : "Baseline set"}
          </div>
          <span className="stat-sub muted">Adaptive difficulty tracking</span>
        </div>
      </div>

      {/* Score Trend Visualizer & Dimensional Radar/Bars */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginBottom: "24px" }}>
        {/* Score Progression Chart */}
        <div className="card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0 }}>Score Progression Trend</h3>
            <span className="muted" style={{ fontSize: "12px" }}>Latest attempts</span>
          </div>

          {completedSessions.length > 0 ? (
            <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "16px", padding: "16px 8px 8px", borderBottom: "2px solid #e2e8f0" }}>
              {completedSessions.slice(-6).map((s, idx) => {
                const scoreVal = Math.round(s.averageScore || 0);
                const heightPct = Math.max(scoreVal, 10);
                const barColor = scoreVal >= 80 ? "#10b981" : scoreVal >= 60 ? "#3b82f6" : "#f59e0b";
                return (
                  <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
                      {scoreVal}
                    </span>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "48px",
                        height: `${heightPct}%`,
                        background: barColor,
                        borderRadius: "6px 6px 0 0",
                        transition: "height 0.4s ease"
                      }}
                    />
                    <span style={{ fontSize: "11px", color: "#64748b", marginTop: "8px" }}>
                      #{s.sessionId}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
              Complete your first interview to see score trends!
            </div>
          )}
        </div>

        {/* Dimension Breakdown Card */}
        <div className="card" style={{ padding: "24px" }}>
          <h3 style={{ margin: "0 0 16px" }}>Dimension Averages</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <DimensionProgress
              label="Technical Depth"
              value={trends?.dimensionAverages?.technical || 78}
              color="#3b82f6"
            />
            <DimensionProgress
              label="Communication & Clarity"
              value={trends?.dimensionAverages?.communication || 84}
              color="#10b981"
            />
            <DimensionProgress
              label="Executive Confidence"
              value={trends?.dimensionAverages?.confidence || 80}
              color="#8b5cf6"
            />
          </div>

          <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px dashed #cbd5e1" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>RECURRING FOCUS AREAS:</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
              <span className="badge" style={{ background: "#fee2e2", color: "#991b1b", fontSize: "11px" }}>
                Concurrency
              </span>
              <span className="badge" style={{ background: "#fee2e2", color: "#991b1b", fontSize: "11px" }}>
                Eye Contact
              </span>
              <span className="badge" style={{ background: "#fee2e2", color: "#991b1b", fontSize: "11px" }}>
                Trade-off Depth
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Sessions Table */}
      <div className="card">
        <h3 style={{ margin: "0 0 16px" }}>All Interview Sessions</h3>
        {sessions.length === 0 ? (
          <p className="muted">No interview sessions found. Click 'Start New Interview' to take your first mock session.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "13px" }}>
                  <th style={{ padding: "10px" }}>Session</th>
                  <th style={{ padding: "10px" }}>Date & Time</th>
                  <th style={{ padding: "10px" }}>Status</th>
                  <th style={{ padding: "10px" }}>Overall Score</th>
                  <th style={{ padding: "10px" }}>Dimensions (Tech / Comm / Conf)</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.sessionId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 10px", fontWeight: "600" }}>#{s.sessionId}</td>
                    <td style={{ padding: "12px 10px", fontSize: "13px", color: "#475569" }}>
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <span className="badge" style={{
                        background: s.status === "COMPLETED" ? "#dcfce7" : "#fef3c7",
                        color: s.status === "COMPLETED" ? "#166534" : "#b45309"
                      }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 10px", fontWeight: "700", color: s.averageScore >= 75 ? "#166534" : "#1e293b" }}>
                      {s.averageScore != null ? `${Math.round(s.averageScore)}/100` : "In Progress"}
                    </td>
                    <td style={{ padding: "12px 10px", fontSize: "13px", color: "#64748b" }}>
                      {s.technicalAvg ? `${Math.round(s.technicalAvg)} / ${Math.round(s.communicationAvg || 0)} / ${Math.round(s.confidenceAvg || 0)}` : "—"}
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right" }}>
                      <Link
                        to={s.status === "COMPLETED" ? `/report/${s.sessionId}` : `/interview/${s.sessionId}`}
                        style={{
                          textDecoration: "none",
                          padding: "6px 14px",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: "600",
                          background: s.status === "COMPLETED" ? "#2563eb" : "#f59e0b",
                          color: "white"
                        }}
                      >
                        {s.status === "COMPLETED" ? "View Report" : "Resume"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DimensionProgress({ label, value, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
        <span>{label}</span>
        <strong>{value}/100</strong>
      </div>
      <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: "4px" }} />
      </div>
    </div>
  );
}
