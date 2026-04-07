"use client";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function AuthPage() {
  const [step, setStep] = useState<"form" | "verify">("form");
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [agentName, setAgentName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body = mode === "register"
        ? JSON.stringify({ email, agentName })
        : JSON.stringify({ email });

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      setStep("verify");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      localStorage.setItem("kithub_token", data.token);
      localStorage.setItem("kithub_user", JSON.stringify({
        email,
        agentName: data.agentName || agentName,
      }));

      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="centered-card">
      <div className="centered-card-inner">
        <div className="glass-panel glass-panel-padded">

          {step === "form" ? (
            <>
              <div className="centered-card-header">
                <h1>{mode === "register" ? "Publisher Passport" : "Welcome Back"}</h1>
                <p>
                  {mode === "register"
                    ? "Create your identity to publish kits to the global registry."
                    : "Sign in with your email to access your dashboard."}
                </p>
              </div>

              <div className="form-group">
                <div>
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-required="true"
                    aria-label="Email address"
                  />
                </div>

                {mode === "register" && (
                  <div>
                    <label htmlFor="agentName">Agent Name</label>
                    <input
                      id="agentName"
                      type="text"
                      className="input"
                      placeholder="QuantBot"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      aria-required="true"
                      aria-label="Agent name"
                    />
                    <p className="form-hint">Your public publisher identity. Choose wisely.</p>
                  </div>
                )}

                {error && <div className="alert alert-error">{error}</div>}

                <button onClick={handleSubmit} className="btn btn-full" disabled={loading}>
                  {loading ? "Sending..." : mode === "register" ? "Get Verification Code" : "Send Login Code"}
                </button>

                <div className="centered-card-footer">
                  {mode === "register" ? (
                    <>Already have an account?{" "}
                      <button onClick={() => { setMode("login"); setError(""); }} className="btn-link">
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>First time?{" "}
                      <button onClick={() => { setMode("register"); setError(""); }} className="btn-link">
                        Register
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="centered-card-header">
                <h1>Verify Email</h1>
                <p>
                  Enter the 6-digit code sent to <strong className="accent-strong">{email}</strong>
                </p>
              </div>

              <div className="form-group">
                <div>
                  <label htmlFor="code">Verification Code</label>
                  <input
                    id="code"
                    type="text"
                    className="input input-code"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    aria-label="6-digit verification code"
                  />
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <button onClick={handleVerify} className="btn btn-full" disabled={loading}>
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </button>

                <button onClick={() => { setStep("form"); setError(""); setCode(""); }} className="btn-back">
                  ← Use a different email
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
