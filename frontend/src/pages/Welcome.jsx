import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page-container">
      {/* Top Header Bar with Branding & Auth Actions */}
      <div className="welcome-top-nav">
        <div className="welcome-brand-group">
          <div className="welcome-brand-logo">
            <span className="brand-primary">Adapt</span>
            <span className="brand-accent">IQ</span>
          </div>
          <span className="welcome-brand-tagline">
            Explainable, Multimodal AI Interview Coach
          </span>
        </div>

        {/* Top Header Log In & Sign Up Buttons */}
        <div className="welcome-top-actions">
          <button
            type="button"
            className="welcome-login-btn top-btn"
            onClick={() => navigate("/login")}
          >
            Log In
          </button>
          <button
            type="button"
            className="welcome-signup-btn top-btn"
            onClick={() => navigate("/register")}
          >
            Sign Up
          </button>
        </div>
      </div>

      {/* Main Hero Card */}
      <div className="welcome-hero-card">
        <div className="welcome-pill-badge">
          <span className="badge-spark">✨</span> Next-Gen AI Interview Preparation
        </div>

        <h1 className="welcome-main-title">
          Master Your Next Tech Interview with Real-Time Multimodal Coaching
        </h1>

        <p className="welcome-subtitle">
          Generic interview tools ask broad, irrelevant questions. <strong>AdaptIQ</strong> analyzes your actual
          resume and target job description to generate role-specific questions, adapts difficulty dynamically in real time,
          and measures your responses using speech acoustics, computer vision, and technical correctness.
        </p>

        {/* Prominent Hero Action Buttons at Top */}
        <div className="welcome-hero-top-actions">
          <button
            type="button"
            className="welcome-login-btn hero-btn"
            onClick={() => navigate("/login")}
          >
            Log In
          </button>
          <button
            type="button"
            className="welcome-signup-btn hero-btn"
            onClick={() => navigate("/register")}
          >
            Sign Up
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="welcome-feature-grid">
          <div className="welcome-feature-box">
            <div className="feature-icon-wrapper">🎯</div>
            <h3>Resume & JD Personalization</h3>
            <p>
              Extracts your real skills, frameworks, and projects from your uploaded resume, aligning questions directly with target job requirements.
            </p>
          </div>

          <div className="welcome-feature-box">
            <div className="feature-icon-wrapper">🎙️</div>
            <h3>Adaptive Interview Engine</h3>
            <p>
              AI dynamically shifts question difficulty between Easy, Medium, and Hard based on your depth, asking intelligent context-aware follow-ups.
            </p>
          </div>

          <div className="welcome-feature-box">
            <div className="feature-icon-wrapper">👁️</div>
            <h3>Multimodal Telemetry</h3>
            <p>
              Measures speaking pace (WPM), filler word count, pauses, and uses camera tracking for real-time eye contact % and posture stability.
            </p>
          </div>

          <div className="welcome-feature-box">
            <div className="feature-icon-wrapper">🔍</div>
            <h3>Explainable 5D Scoring</h3>
            <p>
              Replaces opaque scores with dimension-wise evaluation across Technical Knowledge, Relevance, Communication, Clarity, and Confidence with clear reasons.
            </p>
          </div>

          <div className="welcome-feature-box">
            <div className="feature-icon-wrapper">🗺️</div>
            <h3>5-Day Skill-Gap Plan</h3>
            <p>
              Pinpoints exact technical and communication competencies to improve, generating a day-by-day structured preparation roadmap.
            </p>
          </div>
        </div>

        {/* Multimodal Pipeline Showcase Banner */}
        <div className="welcome-pipeline-banner">
          <div className="pipeline-title">Unified Multimodal Evaluation Pipeline</div>
          <div className="pipeline-steps">
            <div className="pipeline-step">
              <span className="step-num">01</span>
              <strong>Speech Acoustics</strong>
              <span>WPM, fillers, pause ratios</span>
            </div>
            <div className="pipeline-arrow">→</div>
            <div className="pipeline-step">
              <span className="step-num">02</span>
              <strong>Vision Gaze & Posture</strong>
              <span>Eye contact %, body alignment</span>
            </div>
            <div className="pipeline-arrow">→</div>
            <div className="pipeline-step">
              <span className="step-num">03</span>
              <strong>Technical Depth</strong>
              <span>Relevance, correctness, logic</span>
            </div>
            <div className="pipeline-arrow">→</div>
            <div className="pipeline-step">
              <span className="step-num">04</span>
              <strong>Explainable Report</strong>
              <span>5 dimensions & 5-day plan</span>
            </div>
          </div>
        </div>

        {/* Clean Footer Note */}
        <div className="welcome-footer-note">
          <span>🚀 Personalized to your resume. Multimodal real-time analysis. Zero generic questions.</span>
        </div>
      </div>
    </div>
  );
}
