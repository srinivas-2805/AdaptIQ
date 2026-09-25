import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api.js";
import AuthNav from "../components/AuthNav.jsx";
import { GoogleIcon, GitHubIcon, EyeIcon, EyeOffIcon, initiateOAuth } from "../components/OAuthIcons.jsx";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [touchedConfirm, setTouchedConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const passwordsMismatch = touchedConfirm && confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // 1. Client-side Name validation
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    // 2. Client-side Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    // 3. Client-side Password length validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    // 4. Password confirmation check: prevent registration if mismatch
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please ensure Password and Confirm Password are identical.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      localStorage.setItem("adaptiq_token", data.token);
      localStorage.setItem("adaptiq_name", data.name);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleClick() {
    setError("");
    initiateOAuth("google");
  }

  function handleGitHubClick() {
    setError("");
    initiateOAuth("github");
  }

  return (
    <div className="auth-page-full">
      {/* Ambient Radial Glows */}
      <div className="welcome-ambient-glow glow-cyan" />
      <div className="welcome-ambient-glow glow-indigo" />

      {/* Glass Top Navigation */}
      <AuthNav page="register" />

      {/* Main Form Centerpiece */}
      <div className="auth-main-container">
        <div className="auth-window wide">
          {/* Mac-style Window Top Bar */}
          <div className="auth-top-bar">
            <div className="sim-dots">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
            </div>
            <div className="sim-title" style={{ fontSize: "12px" }}>
              AdaptIQ Studio — Candidate Registration
            </div>
            <div className="sim-badges">
              <span
                className="live-pill"
                style={{
                  background: "rgba(56, 189, 248, 0.15)",
                  color: "#38bdf8",
                  borderColor: "rgba(56, 189, 248, 0.3)",
                }}
              >
                ● FREE ACCESS
              </span>
            </div>
          </div>

          <div className="auth-card-body">
            <div className="auth-pill-badge">
              <span className="badge-flair">🚀 Get Started Today</span>
              <span className="badge-divider">•</span>
              <span>100% Resume Tailored Prep</span>
            </div>

            <h1 className="auth-card-title">
              Create Your <span className="gradient-text">Candidate Account</span>
            </h1>
            <p className="auth-card-subtitle">
              Set up your profile to upload your resume, receive dynamically adapted interview questions, and measure your multimodal composure.
            </p>

            {/* Social OAuth Buttons */}
            <div className="auth-oauth-group">
              <button
                type="button"
                className="btn-oauth"
                onClick={handleGoogleClick}
                disabled={loading}
                title="Continue with Google"
              >
                <GoogleIcon />
                <span>Google</span>
              </button>

              <button
                type="button"
                className="btn-oauth"
                onClick={handleGitHubClick}
                disabled={loading}
                title="Continue with GitHub"
              >
                <GitHubIcon />
                <span>GitHub</span>
              </button>
            </div>

            <div className="auth-divider">
              <span>or register with email</span>
            </div>

            {error && (
              <div className="auth-error-banner">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Registration Form */}
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="register-name">
                  Full Name
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="register-name"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="register-email">
                  Email Address
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="register-email"
                    type="email"
                    className="auth-input"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="register-password">
                  Password (min. 6 characters)
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    className="auth-input has-toggle"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="auth-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="register-confirm-password">
                  Confirm Password
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    className={`auth-input has-toggle ${passwordsMismatch ? "has-error" : ""}`}
                    placeholder="Re-enter your password to confirm"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setTouchedConfirm(true);
                    }}
                    autoComplete="new-password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="auth-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>

                {/* Real-time Match Feedback */}
                {passwordsMismatch && (
                  <div className="auth-field-error">
                    <span>⚠️</span>
                    <span>Passwords do not match. Please verify both fields.</span>
                  </div>
                )}
                {passwordsMatch && (
                  <div className="auth-field-success">
                    <span>✓</span>
                    <span>Passwords match perfectly.</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-auth-submit"
                disabled={loading || passwordsMismatch}
              >
                {loading ? (
                  <>
                    <span className="auth-spinner" />
                    <span>Creating your candidate account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Candidate Account</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer Navigation */}
            <div className="auth-card-footer">
              <p className="auth-footer-text">
                Already have an account?{" "}
                <Link to="/login" className="auth-accent-link">
                  Log in to Studio →
                </Link>
              </p>
              <div>
                <Link to="/" className="auth-back-link">
                  ← Return to Welcome Page
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
