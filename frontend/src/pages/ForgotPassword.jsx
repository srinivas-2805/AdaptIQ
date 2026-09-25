import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api.js";
import AuthNav from "../components/AuthNav.jsx";
import { EyeIcon, EyeOffIcon } from "../components/OAuthIcons.jsx";

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1 = Request code, 2 = Set new password
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [generatedCode, setGeneratedCode] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  // Step 1: Request Reset Code
  async function handleRequestCode(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      setGeneratedCode(data.resetToken);
      setResetCode(data.resetToken);
      setSuccess("A 6-digit password reset code has been generated. Enter it below to set your new password.");
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to generate reset code. Please ensure this email is registered.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Reset Password
  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!resetCode.trim()) {
      setError("Please enter the 6-digit reset code.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please ensure both password fields are identical.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        token: resetCode.trim(),
        newPassword,
      });

      // Automatically store new session or redirect to login with confirmation
      if (data.token) {
        localStorage.setItem("adaptiq_token", data.token);
        localStorage.setItem("adaptiq_name", data.name);
        setSuccess("Password updated successfully! Redirecting to your dashboard...");
        setTimeout(() => {
          navigate("/dashboard");
        }, 1200);
      } else {
        navigate("/login", {
          state: { message: "Password updated successfully. Please log in with your new credentials." },
        });
      }
    } catch (err) {
      setError(err.message || "Invalid or expired reset code. Please request a new code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-full">
      {/* Ambient Radial Glows */}
      <div className="welcome-ambient-glow glow-cyan" />
      <div className="welcome-ambient-glow glow-indigo" />

      {/* Glass Top Navigation */}
      <AuthNav page="forgot" />

      {/* Main Centerpiece */}
      <div className="auth-main-container">
        <div className="auth-window">
          {/* Top Window Bar */}
          <div className="auth-top-bar">
            <div className="sim-dots">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
            </div>
            <div className="sim-title" style={{ fontSize: "12px" }}>
              AdaptIQ Studio — Security Recovery
            </div>
            <div className="sim-badges">
              <span className="live-pill" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", borderColor: "rgba(245, 158, 11, 0.3)" }}>
                ● RECOVERY FLOW
              </span>
            </div>
          </div>

          <div className="auth-card-body">
            <div className="auth-pill-badge">
              <span className="badge-flair">🔒 Password Recovery</span>
              <span className="badge-divider">•</span>
              <span>{step === 1 ? "Step 1 of 2: Code Request" : "Step 2 of 2: Set New Password"}</span>
            </div>

            <h1 className="auth-card-title">
              {step === 1 ? (
                <>
                  Reset Your <span className="gradient-text">Password</span>
                </>
              ) : (
                <>
                  Create New <span className="gradient-text">Password</span>
                </>
              )}
            </h1>

            <p className="auth-card-subtitle">
              {step === 1
                ? "Enter your account email. We will generate a secure 6-digit recovery code to reset your credentials."
                : `Enter the 6-digit code sent for ${email}, and choose your new password.`}
            </p>

            {/* Notification Banners */}
            {success && (
              <div className="auth-success-banner">
                <span>✅</span>
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="auth-error-banner">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* If a code was generated in Step 1, highlight it for ease of use */}
            {generatedCode && step === 2 && (
              <div className="auth-code-box">
                <div className="auth-code-label">Your Secure 6-Digit Reset Code</div>
                <div className="auth-code-display">{generatedCode}</div>
                <div className="auth-code-hint">Valid for 15 minutes. Automatically populated below.</div>
              </div>
            )}

            {/* Step 1: Request Code Form */}
            {step === 1 && (
              <form className="auth-form" onSubmit={handleRequestCode} noValidate>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="forgot-email">
                    Account Email Address
                  </label>
                  <div className="auth-input-wrapper">
                    <input
                      id="forgot-email"
                      type="email"
                      className="auth-input"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
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
                      <span>Generating recovery code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Recovery Code</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Step 2: Set New Password Form */}
            {step === 2 && (
              <form className="auth-form" onSubmit={handleResetPassword} noValidate>
                <div className="auth-field">
                  <div className="auth-field-header">
                    <label className="auth-label" htmlFor="reset-code">
                      6-Digit Reset Code
                    </label>
                    <button
                      type="button"
                      className="auth-forgot-link"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      onClick={() => setStep(1)}
                    >
                      Request a different code
                    </button>
                  </div>
                  <div className="auth-input-wrapper">
                    <input
                      id="reset-code"
                      type="text"
                      className="auth-input"
                      placeholder="e.g. 123456"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      maxLength={12}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="reset-new-password">
                    New Password (min. 6 characters)
                  </label>
                  <div className="auth-input-wrapper">
                    <input
                      id="reset-new-password"
                      type={showPassword ? "text" : "password"}
                      className="auth-input has-toggle"
                      placeholder="Enter strong new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={6}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="auth-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide password" : "Show password"}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="reset-confirm-password">
                    Confirm New Password
                  </label>
                  <div className="auth-input-wrapper">
                    <input
                      id="reset-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      className={`auth-input has-toggle ${passwordsMismatch ? "has-error" : ""}`}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="auth-toggle-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>

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
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <>
                      <span>Save Password & Launch Studio</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer Navigation */}
            <div className="auth-card-footer">
              <p className="auth-footer-text">
                Remembered your password?{" "}
                <Link to="/login" className="auth-accent-link">
                  Log in here →
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
