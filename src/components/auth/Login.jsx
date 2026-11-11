
import { useState } from "react";
import { apiFetch } from "../../api";
import "./Login.css";

export default function Login({ onLogin, onCancel }) {
  const [mode, setMode] = useState("login");

  const [mail, setMail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        await apiFetch("/api/register", {
          method: "POST",
          body: JSON.stringify({
            mail: mail.trim().toLowerCase(),
            name: name.trim(),
            password,
          }),
        });
      }

      // Authenticate using the same mail and password.
      await apiFetch("/api/login", {
        method: "POST",
        body: JSON.stringify({
          mail: mail.trim().toLowerCase(),
          password,
        }),
      });

      // Retrieve the authenticated user.
      const user = await apiFetch("/api/me");

      console.log("Found user:", user.id, user.name, user.mail);

      setPassword("");
      setConfirmPassword("");

      onLogin(user);

    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <aside className="auth-hero">
          <div className="auth-brand">
            <div className="auth-brand-icon">P</div>
            <span>PDF Pro</span>
          </div>

          <div className="auth-hero-content">
            <span className="auth-eyebrow">
              YOUR WORKSPACE, REIMAGINED
            </span>

            <h1>
              Your documents.
              <br />
              <span>Securely.</span>
            </h1>

            <p>
              Edit, organize and manage your PDFs in one place.
              Your workspace is ready whenever you are.
            </p>

            <div className="auth-document-art" aria-hidden="true">
              <div className="auth-paper">
                <div className="paper-line paper-line-short" />
                <div className="paper-line" />
                <div className="paper-line paper-line-medium" />
                <div className="paper-line paper-line-short" />
                <div className="paper-signature">〰</div>
              </div>

              <div className="auth-shield">✓</div>
            </div>
          </div>

          <div className="auth-hero-footer">
            <span className="auth-status-dot" />
            Your workspace, always within reach
          </div>
        </aside>

        <main className="auth-main">

          <button
            type="button"
            className="auth-cancel"
            onClick={onCancel}
            aria-label="Close login"
          >
            ✕
          </button>
          <div className="auth-mobile-brand">
            <div className="auth-brand-icon">P</div>
            <span>PDF Pro</span>
          </div>

          <div
            className="auth-tabs"
            role="tablist"
            aria-label="Authentication"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isRegister}
              className={`auth-tab ${!isRegister ? "selected" : ""}`}
              onClick={() => changeMode("login")}
            >
              Log in
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={isRegister}
              className={`auth-tab ${isRegister ? "selected" : ""}`}
              onClick={() => changeMode("register")}
            >
              Create account
            </button>
          </div>

          <div className="auth-heading">
            <span className="auth-heading-icon">
              {isRegister ? "✦" : "↗"}
            </span>

            <h2>
              {isRegister ? "Create your account" : "Welcome back"}
            </h2>

            <p>
              {isRegister
                ? "Get started with your personal PDF workspace."
                : "Log in to access your documents and pick up where you left off."}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>

            {/* Mail address */}
            <div className="auth-field">
              <label htmlFor="auth-mail">Mail address</label>

              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  @
                </span>

                <input
                  id="auth-mail"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={mail}
                  onChange={(e) => setMail(e.target.value)}
                  maxLength={254}
                  required
                />
              </div>
            </div>

            {/* Name: registration only */}
            {isRegister && (
              <div className="auth-field">
                <label htmlFor="auth-name">Name</label>

                <div className="auth-input-wrap">
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={254}
                    required
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>

              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  ◈
                </span>

                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                  placeholder={
                    isRegister
                      ? "At least 12 characters"
                      : "Enter your password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={1024}
                  required
                />

                <button
                  className="auth-password-toggle"
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {isRegister && (
                <span className="auth-hint">
                  Use a long, unique password that you don't use elsewhere.
                </span>
              )}
            </div>

            {/* Confirm password: registration only */}
            {isRegister && (
              <div className="auth-field">
                <label htmlFor="auth-confirm-password">
                  Confirm password
                </label>

                <div className="auth-input-wrap">
                  <span className="auth-input-icon" aria-hidden="true">
                    ◈
                  </span>

                  <input
                    id="auth-confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Enter your password again"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    maxLength={1024}
                    required
                  />
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="auth-error" role="alert">
                <span aria-hidden="true">!</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              <span>
                {loading
                  ? isRegister
                    ? "Creating account..."
                    : "Logging in..."
                  : isRegister
                    ? "Create account"
                    : "Log in"}
              </span>

              {!loading && (
                <span aria-hidden="true">→</span>
              )}
            </button>

          </form>

          <div className="auth-divider">
            <span />
            <span>YOUR DOCUMENT WORKSPACE</span>
            <span />
          </div>

          <p className="auth-switch">
            {isRegister
              ? "Already have an account?"
              : "New to PDF Pro?"}

            <button
              type="button"
              onClick={() =>
                changeMode(isRegister ? "login" : "register")
              }
            >
              {isRegister ? "Log in" : "Create an account"}
            </button>
          </p>

          <div className="auth-security">
            <span className="auth-security-icon">✓</span>
            <span>Your privacy matters. Your documents stay yours.</span>
          </div>

        </main>
      </div>

      <p className="auth-copyright">
        PDF Pro <span>·</span> Your documents, your workspace
      </p>
    </div>
  );
}
