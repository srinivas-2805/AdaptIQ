import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  // useLocation triggers a re-render when changing routes
  const location = useLocation();
  const token = localStorage.getItem("adaptiq_token");
  const name = localStorage.getItem("adaptiq_name");

  // Never display the navbar on the Welcome page ('/'), and never display before login
  if (!token || location.pathname === "/") {
    return null;
  }

  function logout() {
    localStorage.removeItem("adaptiq_token");
    localStorage.removeItem("adaptiq_name");
    navigate("/");
  }

  return (
    <header className="navbar">
      <Link to="/dashboard" className="brand">
        <span style={{ color: "#38bdf8" }}>Adapt</span>IQ
      </Link>
      <nav>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/upload">New Interview</Link>
        <span className="user-chip">👤 {name || "Candidate"}</span>
        <button className="link-btn" onClick={logout}>
          Log out
        </button>
      </nav>
    </header>
  );
}
