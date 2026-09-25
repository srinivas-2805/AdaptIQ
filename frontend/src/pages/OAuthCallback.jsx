import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";

export default function OAuthCallback() {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const processedOAuthCodeRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const errorParam = params.get("error");
    const errorDesc = params.get("error_description");

    if (errorParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
      navigate("/login", {
        replace: true,
        state: { error: errorDesc || "Authentication was canceled or denied." },
      });
      return;
    }

    if (!code) {
      navigate("/login", { replace: true });
      return;
    }

    // Guard against React StrictMode duplicate code execution
    if (
      processedOAuthCodeRef.current ||
      sessionStorage.getItem("adaptiq_consumed_code") === code
    ) {
      return;
    }
    processedOAuthCodeRef.current = true;
    sessionStorage.setItem("adaptiq_consumed_code", code);

    // Immediately clear URL query parameters
    window.history.replaceState({}, document.title, window.location.pathname);

    const provider = state || sessionStorage.getItem("adaptiq_oauth_provider") || "google";
    const redirectUri = window.location.origin + window.location.pathname;

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
        navigate("/login", {
          replace: true,
          state: { error: err.message || "Failed to complete authentication." },
        });
      }
    })();
  }, [navigate]);

  return (
    <div className="auth-page-full">
      <div className="welcome-ambient-glow glow-cyan" />
      <div className="welcome-ambient-glow glow-indigo" />
      <div className="auth-main-container">
        <div className="auth-window" style={{ maxWidth: "380px", textAlign: "center" }}>
          <div className="auth-card-body" style={{ padding: "40px 24px" }}>
            <span className="auth-spinner" style={{ width: "32px", height: "32px", marginBottom: "16px" }} />
            <h2 style={{ color: "#ffffff", fontSize: "18px", margin: "0 0 8px" }}>
              Authenticating with Provider...
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>
              Completing secure login and generating your session token.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
