import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("multimodal");

  function handleStart() {
    const token = localStorage.getItem("adaptiq_token");
    if (token) {
      navigate("/upload");
    } else {
      navigate("/register");
    }
  }

  function handleLogin() {
    navigate("/login");
  }

  function handleCoding() {
    const token = localStorage.getItem("adaptiq_token");
    if (token) {
      navigate("/coding");
    } else {
      navigate("/login");
    }
  }

  return (
    <div className="welcome-page-full">
      {/* Glow Backdrops */}
      <div className="welcome-ambient-glow glow-cyan" />
      <div className="welcome-ambient-glow glow-indigo" />

      {/* Top Floating Glass Navigation Header */}
      <header className="welcome-glass-nav">
        <div className="welcome-nav-container">
          <div className="welcome-logo-wrap" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="welcome-logo-icon">
              <span>⚡</span>
            </div>
            <div className="welcome-logo-text">
              <span className="logo-brand">Adapt</span>
              <span className="logo-accent">IQ</span>
            </div>
            <span className="welcome-status-pill">
              <span className="pulse-dot" /> Engine Active
            </span>
          </div>

          <nav className="welcome-nav-links">
            <a href="#simulator">Live Studio</a>
            <a href="#difference">Why AdaptIQ</a>
            <a href="#pipeline">Multimodal Pipeline</a>
            <a href="#pillars">Core Pillars</a>
          </nav>

          <div className="welcome-nav-actions">
            <button type="button" className="btn-ghost" onClick={handleLogin}>
              Log In
            </button>
            <button type="button" className="btn-glow-primary" onClick={handleStart}>
              Start Free Session →
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="welcome-hero-section">
        <div className="welcome-content-container">
          <div className="welcome-pill-badge-hero">
            <span className="badge-flair">✨ Next-Generation AI Interview Mastery</span>
            <span className="badge-divider">•</span>
            <span>Real-Time Voice & Vision Telemetry</span>
          </div>

          <h1 className="welcome-hero-title">
            Step Into Your Next Tech Interview With{" "}
            <span className="gradient-text">Absolute Confidence.</span>
          </h1>

          <p className="welcome-hero-description">
            Generic interview tools quiz you on generic trivia. <strong>AdaptIQ</strong> ingests your actual
            resume and target job description, conducts an adaptive voice/video mock interview, tracks your
            speech acoustics and visual posture, and provides explainable 5-dimension rationales with a personalized 5-day prep plan.
          </p>

          <div className="welcome-cta-group">
            <button type="button" className="btn-hero-primary" onClick={handleStart}>
              <span className="btn-icon">🚀</span>
              <span>Launch Mock Interview</span>
            </button>

            <button type="button" className="btn-hero-secondary" onClick={handleCoding}>
              <span className="btn-icon">💻</span>
              <span>Explore Coding Sandbox</span>
            </button>

            <button type="button" className="btn-hero-tertiary" onClick={() => {
              const el = document.getElementById("simulator");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}>
              <span>View Interactive Demo ↓</span>
            </button>
          </div>

          {/* Social Proof / Metrics Ribbon */}
          <div className="welcome-metrics-ribbon">
            <div className="metric-box">
              <span className="metric-num">100%</span>
              <span className="metric-label">Resume & JD Personalization</span>
            </div>
            <div className="metric-box">
              <span className="metric-num">5-Dimension</span>
              <span className="metric-label">Explainable Scoring Criteria</span>
            </div>
            <div className="metric-box">
              <span className="metric-num">Real-Time</span>
              <span className="metric-label">Acoustics & MediaPipe Vision</span>
            </div>
            <div className="metric-box">
              <span className="metric-num">5-Day</span>
              <span className="metric-label">Targeted Skill-Gap Roadmap</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Studio Simulator Showcase */}
      <section id="simulator" className="welcome-simulator-section">
        <div className="welcome-content-container">
          <div className="section-header-center">
            <div className="section-eyebrow">THE EXPERIENCE</div>
            <h2 className="section-title">An Interview Experience Indistinguishable From Reality</h2>
            <p className="section-subtitle">
              Experience dynamic follow-ups, acoustic speech pacing, facial eye contact analysis, and real-time difficulty shifts as you answer.
            </p>
          </div>

          <div className="simulator-window">
            <div className="simulator-top-bar">
              <div className="sim-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <div className="sim-title">
                AdaptIQ Live Studio — Session #104 (Senior Full-Stack & Systems Architect)
              </div>
              <div className="sim-badges">
                <span className="live-pill">● LIVE WEBRTC</span>
                <span className="diff-pill">🔥 Difficulty: Hard</span>
              </div>
            </div>

            <div className="simulator-main-grid">
              {/* Left Column: AI Interviewer & Question Feed */}
              <div className="sim-left-panel">
                <div className="sim-interviewer-card">
                  <div className="ai-avatar-group">
                    <div className="ai-avatar-ring">
                      <span className="ai-avatar-icon">🤖</span>
                    </div>
                    <div>
                      <div className="ai-name">Dr. Alex Vance</div>
                      <div className="ai-role">Principal Systems Screener • AdaptIQ AI</div>
                    </div>
                  </div>

                  <div className="audio-wave-anim">
                    <span className="bar" />
                    <span className="bar" />
                    <span className="bar" />
                    <span className="bar" />
                    <span className="bar" />
                    <span className="bar" />
                    <span className="bar" />
                  </div>
                </div>

                <div className="sim-question-box">
                  <span className="q-tag">TAILORED FROM YOUR RESUME: E-COMMERCE MICROSERVICES</span>
                  <p className="q-text">
                    "I noticed on your resume that you architected an order processing system in Spring Boot with MySQL and Redis.
                    When handling a 10x traffic spike with network partitions between services, how do you prevent ghost transactions
                    and ensure idempotency across distributed state?"
                  </p>
                </div>

                <div className="sim-difficulty-shift-alert">
                  <span className="alert-icon">⚡</span>
                  <div>
                    <strong>Adaptive Engine Adaptation:</strong> Candidate provided high technical clarity in previous round.
                    Difficulty dynamically shifted from <em>Medium</em> → <strong>Hard</strong>.
                  </div>
                </div>
              </div>

              {/* Right Column: Candidate Telemetry Viewport & 5D Feedback */}
              <div className="sim-right-panel">
                <div className="sim-video-viewport">
                  <div className="sim-video-mockup">
                    <div className="sim-face-reticle" />
                    <div className="sim-video-candidate-label">Candidate Stream (WebRTC 720p)</div>

                    {/* HUD Telemetry Badges */}
                    <div className="sim-hud-overlay">
                      <div className="sim-hud-pill">
                        👁️ Eye Contact: <strong>89% (Optimal)</strong>
                      </div>
                      <div className="sim-hud-pill">
                        🧍 Posture: <strong>Upright & Aligned</strong>
                      </div>
                      <div className="sim-hud-pill">
                        🎙️ Pace: <strong>142 WPM • 0 Fillers</strong>
                      </div>
                      <div className="sim-hud-pill">
                        🟢 Telemetry: <strong>Active</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5-Dimension Explainable Radar / Score Breakdown */}
                <div className="sim-feedback-card">
                  <div className="sim-feedback-header">
                    <h4>Explainable 5-Dimension Score:</h4>
                    <span className="sim-overall-score">Score: 88/100</span>
                  </div>

                  <div className="sim-dimension-grid">
                    <div className="dim-row">
                      <span>Technical Depth:</span>
                      <div className="dim-progress"><div className="dim-fill" style={{ width: "92%" }} /></div>
                      <strong>92/100</strong>
                    </div>
                    <div className="dim-row">
                      <span>Direct Relevance:</span>
                      <div className="dim-progress"><div className="dim-fill" style={{ width: "90%" }} /></div>
                      <strong>90/100</strong>
                    </div>
                    <div className="dim-row">
                      <span>Verbal Communication:</span>
                      <div className="dim-progress"><div className="dim-fill" style={{ width: "85%" }} /></div>
                      <strong>85/100</strong>
                    </div>
                    <div className="dim-row">
                      <span>Logical Clarity:</span>
                      <div className="dim-progress"><div className="dim-fill" style={{ width: "88%" }} /></div>
                      <strong>88/100</strong>
                    </div>
                    <div className="dim-row">
                      <span>Poise & Confidence:</span>
                      <div className="dim-progress"><div className="dim-fill" style={{ width: "94%" }} /></div>
                      <strong>94/100</strong>
                    </div>
                  </div>

                  <div className="sim-rationale-snippet">
                    💡 <em>"Excellent breakdown of distributed idempotency keys and transactional outbox patterns. Pacing was confident with steady direct gaze."</em>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem vs. Solution (Why AdaptIQ is Different) */}
      <section id="difference" className="welcome-difference-section">
        <div className="welcome-content-container">
          <div className="section-header-center">
            <div className="section-eyebrow">THE EVOLUTION</div>
            <h2 className="section-title">Why Traditional Interview Prep Leaves You Unprepared</h2>
            <p className="section-subtitle">
              Most tools ask generic LeetCode questions or surface-level trivia. AdaptIQ prepares your mind, voice, and composure for the real room.
            </p>
          </div>

          <div className="difference-comparison-grid">
            <div className="comparison-card traditional-card">
              <div className="card-badge-bad">❌ Traditional Mock Interview Tools</div>
              <ul className="comparison-list">
                <li>
                  <strong>Generic, Static Questions:</strong> Asks textbook trivia irrelevant to your specific background or the actual job role.
                </li>
                <li>
                  <strong>Fixed Difficulty:</strong> Never adapts whether you are an entry-level graduate or a staff engineer.
                </li>
                <li>
                  <strong>Opaque Mystery Scores:</strong> Hands you a single "73/100" without explaining what you missed or why.
                </li>
                <li>
                  <strong>Ignores Voice & Vision:</strong> Doesn't measure vocal fillers ("um", "like"), rushed cadence, or nervous eye contact.
                </li>
                <li>
                  <strong>Zero Next Steps:</strong> Leaves you with no actionable roadmap or targeted drills to fix your gaps.
                </li>
              </ul>
            </div>

            <div className="comparison-card adaptiq-card">
              <div className="card-badge-good">✨ The AdaptIQ Approach</div>
              <ul className="comparison-list">
                <li>
                  <strong>100% Resume & JD Personalization:</strong> Apache PDFBox and LLMs extract your true projects, tech stack, and role requirements.
                </li>
                <li>
                  <strong>Real-Time Dynamic Difficulty:</strong> Questions automatically shift Easy $\leftrightarrow$ Medium $\leftrightarrow$ Hard based on response quality.
                </li>
                <li>
                  <strong>Explainable 5-Dimension Scoring:</strong> Dimension-by-dimension breakdowns (Technical, Relevance, Communication, Clarity, Confidence) with concrete reasons.
                </li>
                <li>
                  <strong>Multimodal Audio & Vision Telemetry:</strong> Real-time speech acoustics (WPM, fillers, pauses) and MediaPipe gaze and posture tracking.
                </li>
                <li>
                  <strong>5-Day Targeted Preparation Plan:</strong> Auto-generates an actionable day-by-day plan with specific architectural and communication drills.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Multimodal Pipeline Architecture */}
      <section id="pipeline" className="welcome-pipeline-section">
        <div className="welcome-content-container">
          <div className="section-header-center">
            <div className="section-eyebrow">INTELLIGENT PIPELINE</div>
            <h2 className="section-title">Tri-Modal Telemetry & Reasoning Architecture</h2>
            <p className="section-subtitle">
              Every answer is synthesized across speech acoustics, visual behavior, and technical correctness.
            </p>
          </div>

          <div className="pipeline-flow-container">
            <div className="pipeline-card">
              <div className="pipeline-icon-circle">🎙️</div>
              <span className="pipeline-step-badge">Stage 01</span>
              <h3>Speech Acoustics</h3>
              <p>
                Calculates speaking speed (WPM), speech pauses, and detects vocal hesitation fillers (um, like, basically) via Whisper and frequency analysis.
              </p>
            </div>

            <div className="pipeline-connector">→</div>

            <div className="pipeline-card">
              <div className="pipeline-icon-circle">👁️</div>
              <span className="pipeline-step-badge">Stage 02</span>
              <h3>Computer Vision</h3>
              <p>
                MediaPipe-assisted visual presence tracking calculates eye contact consistency % and upright posture alignment in real-time.
              </p>
            </div>

            <div className="pipeline-connector">→</div>

            <div className="pipeline-card">
              <div className="pipeline-icon-circle">🧠</div>
              <span className="pipeline-step-badge">Stage 03</span>
              <h3>Semantic Depth</h3>
              <p>
                Evaluates algorithmic precision, architectural trade-offs, and direct relevance to the question and target job specifications.
              </p>
            </div>

            <div className="pipeline-connector">→</div>

            <div className="pipeline-card highlight-card">
              <div className="pipeline-icon-circle">📊</div>
              <span className="pipeline-step-badge">Stage 04</span>
              <h3>Explainable Synthesis</h3>
              <p>
                Synthesizes all signals into an explainable 5D scorecard, identified skill gaps, and a tailored 5-day preparation roadmap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Core Pillars Grid */}
      <section id="pillars" className="welcome-pillars-section">
        <div className="welcome-content-container">
          <div className="section-header-center">
            <div className="section-eyebrow">COMPLETE PLATFORM</div>
            <h2 className="section-title">Built for Candidates Aiming for Top-Tier Engineering Roles</h2>
            <p className="section-subtitle">
              From resume analysis and dynamic interview rounds to auto-executed coding challenges and longitudinal analytics.
            </p>
          </div>

          <div className="pillars-grid">
            <div className="pillar-card">
              <div className="pillar-icon">📄</div>
              <h3>PDF Resume & JD Parsing</h3>
              <p>
                Upload your PDF or TXT resume. AdaptIQ uses Apache PDFBox and LLMs to identify specific frameworks, databases, and microservices projects.
              </p>
            </div>

            <div className="pillar-card">
              <div className="pillar-icon">⚡</div>
              <h3>Adaptive Difficulty Shifts</h3>
              <p>
                Just like a senior interviewer, the AI presses deeper into architectural decisions if your answers are sharp, or guides you if you stumble.
              </p>
            </div>

            <div className="pillar-card">
              <div className="pillar-icon">🗣️</div>
              <h3>AI Voice & Live Transcription</h3>
              <p>
                The AI speaks questions aloud using natural TTS, and listens to your spoken answer with zero-latency speech recognition or Whisper.
              </p>
            </div>

            <div className="pillar-card">
              <div className="pillar-icon">🔍</div>
              <h3>Explainable 5D Rationales</h3>
              <p>
                Gain clarity with individual scores for Technical Depth, Relevance, Communication, Clarity, and Confidence—each with clear written explanations.
              </p>
            </div>

            <div className="pillar-card">
              <div className="pillar-icon">🗺️</div>
              <h3>5-Day Skill-Gap Preparation Plan</h3>
              <p>
                Receive an actionable, day-by-day roadmap with specific technical topics, system design scenarios, and verbal drills to practice.
              </p>
            </div>

            <div className="pillar-card">
              <div className="pillar-icon">💻</div>
              <h3>Auto-Executed Coding Sandbox</h3>
              <p>
                Tackle algorithmic challenges in Python 3 and JavaScript with isolated subprocess execution, automated unit test verification, and Big-O assessment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Footer Section */}
      <section className="welcome-cta-section">
        <div className="welcome-content-container">
          <div className="cta-banner-card">
            <div className="cta-sparkle">✨</div>
            <h2 className="cta-title">Ready To Transform Your Interview Performance?</h2>
            <p className="cta-subtitle">
              Upload your resume and experience your first personalized, multimodal AI mock interview in less than 2 minutes.
            </p>

            <div className="cta-actions">
              <button type="button" className="btn-cta-primary" onClick={handleStart}>
                Start Your First Mock Interview Now →
              </button>
              <button type="button" className="btn-cta-secondary" onClick={handleCoding}>
                Practice Coding Sandbox
              </button>
            </div>

            <div className="cta-reassurance">
              <span>🔒 Private & Secure • Zero Cost in Mock Mode • Instant Feedback</span>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="welcome-footer">
        <div className="welcome-content-container footer-content">
          <div className="footer-left">
            <div className="footer-logo">
              <span className="brand-white">Adapt</span>
              <span className="brand-cyan">IQ</span>
            </div>
            <p className="footer-desc">
              Explainable, Multimodal AI Interview Coach with Personalized Skill-Gap Analysis.
            </p>
          </div>

          {/* <div className="footer-tech-stack">
            <span>Powered by Spring Boot 3 • Python FastAPI • React 18 • MySQL 8 • MediaPipe</span>
          </div> */}
        </div>
      </footer>
    </div>
  );
}
