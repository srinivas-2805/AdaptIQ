import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api.js";
import AuthNav from "../components/AuthNav.jsx";
import { GoogleIcon, GitHubIcon, EyeIcon, EyeOffIcon, initiateOAuth } from "../components/OAuthIcons.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const successNotice = location.state?.message;
  const processedOAuthCodeRef = useRef(false);

  // Process incoming OAuth callback parameters (e.g. ?code=...&state=google)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const errorParam = params.get("error");
    const errorDesc = params.get("error_description");

    if (errorParam) {
      setError(errorDesc || "Sign-in was canceled or access was denied.");
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      // Guard against React StrictMode duplicate mounting of single-use authorization code
      if (
        processedOAuthCodeRef.current ||
        sessionStorage.getItem("adaptiq_consumed_code") === code
      ) {
        return;
      }
      processedOAuthCodeRef.current = true;
      sessionStorage.setItem("adaptiq_consumed_code", code);

      // Immediately clear the code from the address bar so duplicate requests are impossible
      window.history.replaceState({}, document.title, window.location.pathname);

      const provider = state || sessionStorage.getItem("adaptiq_oauth_provider") || "google";
      const redirectUri = window.location.origin + "/login";

      setLoading(true);
      setLoadingMessage(`Verifying credentials with ${provider === "google" ? "Google" : "GitHub"}...`);

      (async () => {
        try {
          const { data } = await api.post(`/auth/oauth/${provider}`, {
            code,
            redirectUri,
          });

          localStorage.setItem("adaptiq_token", data.token);
          localStorage.setItem("adaptiq_name", data.name);
          sessionStorage.removeItem("adaptiq_oauth_provider");
          navigate("/dashboard", { replace: true });
        } catch (err) {
          setError(err.message || "Failed to complete authentication. Please try again.");
        } finally {
          setLoading(false);
          setLoadingMessage("");
        }
      })();
    }
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    setLoadingMessage("Signing in to Studio...");
    try {
      const { data } = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      localStorage.setItem("adaptiq_token", data.token);
      localStorage.setItem("adaptiq_name", data.name);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
      setLoadingMessage("");
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
      <AuthNav page="login" />

      {/* Main Form Centerpiece */}
      <div className="auth-main-container">
        <div className="auth-window">
          {/* Mac-style Window Top Bar */}
          <div className="auth-top-bar">
            <div className="sim-dots">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
            </div>
            <div className="sim-title" style={{ fontSize: "12px" }}>
              AdaptIQ Studio — Candidate Portal
            </div>
            <div className="sim-badges">
              <span
                className="live-pill"
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                  borderColor: "rgba(16, 185, 129, 0.3)",
                }}
              >
                ● SECURE JWT
              </span>
            </div>
          </div>

          <div className="auth-card-body">
            <div className="auth-pill-badge">
              <span className="badge-flair">✨ AI Interview Studio</span>
              <span className="badge-divider">•</span>
              <span>Candidate Sign In</span>
            </div>

            <h1 className="auth-card-title">
              Welcome Back to <span className="gradient-text">AdaptIQ</span>
            </h1>
            <p className="auth-card-subtitle">
              Sign in to resume your tailored mock interview rounds, multimodal evaluations, and personalized preparation plan.
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
              <span>or sign in with email</span>
            </div>

            {/* Notification Banners */}
            {successNotice && (
              <div className="auth-success-banner">
                <span>✅</span>
                <span>{successNotice}</span>
              </div>
            )}

            {error && (
              <div className="auth-error-banner">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="login-email">
                  Email Address
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="login-email"
                    type="email"
                    className={`auth-input ${error && !email ? "has-error" : ""}`}
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
                <div className="auth-field-header">
                  <label className="auth-label" htmlFor="login-password">
                    Password
                  </label>
                  <Link to="/forgot-password" className="auth-forgot-link">
                    Forgot password?
                  </Link>
                </div>
                <div className="auth-input-wrapper">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    className={`auth-input has-toggle ${error && !password ? "has-error" : ""}`}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
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

              <button
                type="submit"
                className="btn-auth-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="auth-spinner" />
                    <span>{loadingMessage || "Signing in to Studio..."}</span>
                  </>
                ) : (
                  <>
                    <span>Log In to Studio</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer Navigation */}
            <div className="auth-card-footer">
              <p className="auth-footer-text">
                Don't have an account yet?{" "}
                <Link to="/register" className="auth-accent-link">
                  Create account →
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
