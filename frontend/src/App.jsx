import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Welcome from "./pages/Welcome.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import OAuthCallback from "./pages/OAuthCallback.jsx";
import Upload from "./pages/Upload.jsx";
import Interview from "./pages/Interview.jsx";
import Report from "./pages/Report.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CodingRound from "./pages/CodingRound.jsx";

function isAuthenticated() {
  return !!localStorage.getItem("adaptiq_token");
}

function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const location = useLocation();
  const isDarkShell = ["/", "/login", "/register", "/forgot-password", "/oauth/callback"].includes(location.pathname);

  return (
    <div className={`app-shell ${isDarkShell ? "welcome-shell" : ""}`}>
      <Navbar />
      <main className={isDarkShell ? "app-content-full" : "app-content"}>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview/:sessionId"
            element={
              <ProtectedRoute>
                <Interview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report/:sessionId"
            element={
              <ProtectedRoute>
                <Report />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coding"
            element={
              <ProtectedRoute>
                <CodingRound />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
