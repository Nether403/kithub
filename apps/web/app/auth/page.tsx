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

      // Store token and user info
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
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh', padding: '2rem' }}>
      <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem' }}>

        {step === "form" ? (
          <>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', textAlign: 'center' }}>
              {mode === "register" ? "Publisher Passport" : "Welcome Back"}
            </h1>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>
              {mode === "register"
                ? "Create your identity to publish kits to the global registry."
                : "Sign in with your email to access your dashboard."}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.4rem' }}>
                    Your public publisher identity. Choose wisely.
                  </p>
                </div>
              )}

              {error && (
                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-xs)', background: 'rgba(255,77,106,0.08)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              <button onClick={handleSubmit} className="btn" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? "Sending..." : mode === "register" ? "Get Verification Code" : "Send Login Code"}
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {mode === "register" ? (
                  <>Already have an account?{" "}
                    <button onClick={() => { setMode("login"); setError(""); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>
                      Sign in
                    </button>
                  </>
                ) : (
                  <>First time?{" "}
                    <button onClick={() => { setMode("register"); setError(""); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>
                      Register
                    </button>
                  </>
                )}
              </p>
            </div>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', textAlign: 'center' }}>
              Verify Email
            </h1>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>
              Enter the 6-digit code sent to <strong style={{ color: 'var(--accent)' }}>{email}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label htmlFor="code">Verification Code</label>
                <input
                  id="code"
                  type="text"
                  className="input"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '1.5rem', letterSpacing: '0.3em' }}
                />
              </div>

              {error && (
                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-xs)', background: 'rgba(255,77,106,0.08)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              <button onClick={handleVerify} className="btn" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>

              <button onClick={() => { setStep("form"); setError(""); setCode(""); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                ← Use a different email
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
