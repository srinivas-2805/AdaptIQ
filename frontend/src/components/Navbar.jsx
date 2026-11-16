import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  // useLocation triggers a re-render when changing routes
  const location = useLocation();
  const token = localStorage.getItem("adaptiq_token");
  const name = localStorage.getItem("adaptiq_name");

  // Never display the navbar on the Welcome page or unauthenticated auth pages
  const publicPages = ["/", "/login", "/register", "/forgot-password", "/oauth/callback"];
  if (!token || publicPages.includes(location.pathname)) {
    return null;
  }

  function logout() {
    localStorage.removeItem("adaptiq_token");
    localStorage.removeItem("adaptiq_name");
    navigate("/");
  }

  // Extract initials from candidate name
  const candidateInitials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "C";

  return (
    <header className="navbar">
      <div className="navbar-left">
        <Link to="/dashboard" className="navbar-brand-wrap">
          <div className="navbar-logo-icon">
            <span>⚡</span>
          </div>
          <div className="navbar-logo-text">
            <span className="logo-brand">Adapt</span>
            <span className="logo-accent">IQ</span>
          </div>
        </Link>
        <span className="navbar-copilot-pill">
          <span className="pulse-dot" /> Copilot Active
        </span>
      </div>

      <nav className="navbar-links">
        <Link
          to="/dashboard"
          className={location.pathname === "/dashboard" ? "active" : ""}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Dashboard
        </Link>

        <Link
          to="/upload"
          className={location.pathname === "/upload" ? "active" : ""}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"></path>
          </svg>
          New Interview
        </Link>
      </nav>

      <div className="navbar-right">
        <div className="user-profile-chip" title={name || "Candidate"}>
          <div className="user-avatar-circle">{candidateInitials}</div>
          <div className="user-info-text">
            <span className="user-name">{name || "Candidate"}</span>
            <span className="user-role-badge">Pro Candidate</span>
          </div>
        </div>

        <button type="button" className="navbar-logout-btn" onClick={logout} title="Sign out">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Log out</span>
        </button>
      </div>
    </header>
  );
}
