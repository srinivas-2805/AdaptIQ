import { Link, useNavigate } from "react-router-dom";

export default function AuthNav({ page = "login" }) {
  const navigate = useNavigate();

  return (
    <header className="welcome-glass-nav">
      <div className="welcome-nav-container">
        <div className="welcome-logo-wrap" onClick={() => navigate("/")} title="AdaptIQ Home">
          <div className="welcome-logo-icon">
            <span>⚡</span>
          </div>
          <div className="welcome-logo-text">
            <span className="logo-brand">Adapt</span>
            <span className="logo-accent">IQ</span>
          </div>
          <span className="welcome-status-pill">
            <span className="pulse-dot" /> Secure Auth
          </span>
        </div>

        <nav className="welcome-nav-links" style={{ display: "none" }}>
          {/* Kept for DOM structure alignment */}
        </nav>

        <div className="welcome-nav-actions">
          <Link to="/" className="btn-ghost" style={{ textDecoration: "none" }}>
            ← Welcome
          </Link>
          {page === "login" ? (
            <Link to="/register" className="btn-glow-primary" style={{ textDecoration: "none" }}>
              Start Free Session →
            </Link>
          ) : (
            <Link to="/login" className="btn-glow-primary" style={{ textDecoration: "none" }}>
              Log In →
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
