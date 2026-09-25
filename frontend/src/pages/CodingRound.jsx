import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api.js";

export default function CodingRound() {
  const [searchParams] = useSearchParams();
  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [language, setLanguage] = useState("python"); // "python" | "javascript"
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [executionResult, setExecutionResult] = useState(null);

  useEffect(() => {
    fetchProblems();
  }, []);

  async function fetchProblems() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/interviews/coding/problems");
      const list = data.problems || [];
      setProblems(list);

      const targetId = searchParams.get("id");
      const initial = list.find((p) => p.id === targetId) || list[0];
      if (initial) {
        setSelectedProblem(initial);
        setCode(initial.starterCode[language] || initial.starterCode.python || "");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load coding problems");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectProblem(problem) {
    setSelectedProblem(problem);
    setCode(problem.starterCode[language] || problem.starterCode.python || "");
    setExecutionResult(null);
    setError("");
  }

  function handleLanguageChange(newLang) {
    setLanguage(newLang);
    if (selectedProblem) {
      setCode(selectedProblem.starterCode[newLang] || "");
    }
    setExecutionResult(null);
  }

  function handleReset() {
    if (selectedProblem) {
      setCode(selectedProblem.starterCode[language] || "");
      setExecutionResult(null);
    }
  }

  function handleKeyDown(e) {
    // Support Tab key in code editor
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + "    " + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4;
      }, 0);
    }
  }

  async function handleRunCode() {
    if (!selectedProblem || !code.trim()) return;
    setRunning(true);
    setError("");
    setExecutionResult(null);

    try {
      const { data } = await api.post("/interviews/coding/execute", {
        language,
        problemId: selectedProblem.id,
        code
      });
      setExecutionResult(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Execution failed");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="page" style={{ textAlign: "center", padding: "80px" }}>
        <h2>Loading Technical Coding Round...</h2>
        <p className="muted">Fetching sandbox problems and environment...</p>
      </div>
    );
  }

  return (
    <div className="page coding-round-page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "28px" }}>💻</span>
            <h1>Technical Coding Sandbox Round</h1>
          </div>
          <p className="muted">
            Auto-executed algorithmic challenges with unit test verification, execution timing, and Big-O complexity feedback.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/dashboard" className="btn-secondary" style={{ textDecoration: "none", padding: "10px 16px" }}>
            📊 Progress Dashboard
          </Link>
          <Link to="/upload" style={{ textDecoration: "none", padding: "10px 16px", background: "#2563eb", color: "white", borderRadius: "8px", fontWeight: "600" }}>
            + Mock Interview
          </Link>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Problem Selection Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {problems.map((p) => {
          const isSelected = selectedProblem?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectProblem(p)}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                background: isSelected ? "#eff6ff" : "white",
                color: isSelected ? "#1d4ed8" : "#334155",
                fontWeight: isSelected ? "700" : "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <span>{p.title}</span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: p.difficulty === "Easy" ? "#dcfce7" : "#fef3c7",
                  color: p.difficulty === "Easy" ? "#166534" : "#b45309"
                }}
              >
                {p.difficulty}
              </span>
            </button>
          );
        })}
      </div>

      {selectedProblem && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}>
          {/* Left Column: Problem Statement & Test Case Specs */}
          <div className="card" style={{ margin: 0, padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ margin: 0, fontSize: "20px" }}>{selectedProblem.title}</h2>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  padding: "3px 10px",
                  borderRadius: "12px",
                  background: selectedProblem.difficulty === "Easy" ? "#dcfce7" : "#fef3c7",
                  color: selectedProblem.difficulty === "Easy" ? "#166534" : "#b45309"
                }}
              >
                {selectedProblem.difficulty}
              </span>
            </div>

            <p style={{ color: "#334155", lineHeight: "1.6", fontSize: "14px", marginBottom: "16px" }}>
              {selectedProblem.description}
            </p>

            <h4 style={{ margin: "16px 0 8px", fontSize: "14px", color: "#1e293b" }}>Test Cases:</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {selectedProblem.testCases.map((tc, idx) => (
                <div key={idx} style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px" }}>
                  <div style={{ color: "#64748b" }}>
                    <strong>Input:</strong> <code style={{ color: "#0f172a" }}>{tc.input}</code>
                  </div>
                  <div style={{ color: "#64748b", marginTop: "4px" }}>
                    <strong>Expected:</strong> <code style={{ color: "#166534" }}>{tc.expected}</code>
                  </div>
                </div>
              ))}
            </div>

            {/* Execution Result Details */}
            {executionResult && (
              <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "2px solid #e2e8f0" }}>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    marginBottom: "14px",
                    background: executionResult.allPassed ? "#ecfdf5" : "#fef2f2",
                    border: `1px solid ${executionResult.allPassed ? "#a7f3d0" : "#fecaca"}`
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>{executionResult.allPassed ? "✅" : "❌"}</span>
                    <strong style={{ color: executionResult.allPassed ? "#065f46" : "#991b1b" }}>
                      {executionResult.allPassed
                        ? "All Test Cases Passed!"
                        : "Some Test Cases Failed or Raised an Exception"}
                    </strong>
                  </div>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "6px" }}>
                    Runtime: <strong>{executionResult.runtimeMs} ms</strong> • Memory: ~<strong>{executionResult.memoryMb} MB</strong>
                  </div>
                </div>

                {executionResult.complexityAnalysis && (
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px", borderRadius: "8px", fontSize: "13px", color: "#1e40af", marginBottom: "14px" }}>
                    ⚡ <strong>Algorithmic Assessment:</strong> {executionResult.complexityAnalysis}
                  </div>
                )}

                <h4 style={{ margin: "12px 0 8px", fontSize: "13px" }}>Detailed Test Results:</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {(executionResult.results || []).map((r, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        background: r.passed ? "#f0fdf4" : "#fef2f2",
                        borderLeft: `4px solid ${r.passed ? "#10b981" : "#ef4444"}`
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Case #{i + 1}: <strong>{r.passed ? "Passed" : "Failed"}</strong></span>
                        <span className="muted">{r.executionTimeMs} ms</span>
                      </div>
                      <div style={{ marginTop: "4px" }}>
                        Input: <code>{r.input}</code> | Expected: <code>{r.expected}</code> | Got: <code style={{ color: r.passed ? "#166534" : "#dc2626" }}>{r.actual}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Code Editor & Controls */}
          <div className="card" style={{ margin: 0, padding: "20px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>Language:</label>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  style={{ width: "auto", padding: "6px 12px", fontSize: "13px" }}
                >
                  <option value="python">Python 3</option>
                  <option value="javascript">JavaScript (Node.js)</option>
                </select>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={handleReset}
                style={{ padding: "6px 12px", fontSize: "12px" }}
              >
                ↺ Reset Template
              </button>
            </div>

            <textarea
              rows={18}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: "13px",
                lineHeight: "1.5",
                background: "#0f172a",
                color: "#e2e8f0",
                padding: "16px",
                borderRadius: "8px",
                resize: "vertical",
                border: "1px solid #334155"
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
              <span className="muted" style={{ fontSize: "12px" }}>
                Press <strong>Tab</strong> to indent 4 spaces.
              </span>
              <button
                type="button"
                disabled={running || !code.trim()}
                onClick={handleRunCode}
                style={{
                  padding: "10px 24px",
                  fontSize: "15px",
                  background: "#16a34a",
                  color: "white",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: "700",
                  cursor: running ? "not-allowed" : "pointer"
                }}
              >
                {running ? "Executing in Sandbox..." : "▶ Run Code in Sandbox"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
