"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Please enter a valid email address";
  return null;
}

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [step, setStep] = useState<"form" | "verify">("form");
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailError = useMemo(() => emailTouched ? validateEmail(email) : null, [email, emailTouched]);

  const handleSubmit = async () => {
    setError("");

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      setEmailTouched(true);
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: mode === "register" ? { agentName } : undefined
        }
      });

      if (signInError) throw signInError;

      setStep("verify");
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email'
      });

      if (verifyError) throw verifyError;
      
      // Store local metadata if needed
      localStorage.setItem("kithub_user", JSON.stringify({
        email: data?.user?.email,
        agentName: data?.user?.user_metadata?.agentName || agentName,
      }));

      // In App router with SSR supabase, cookies are managed server side now
      // so we can just route to the dashboard and middleware handles the rest!
      router.push("/dashboard");

    } catch (err) {
      const error = err as Error;
      setError(error.message || "Invalid verification code.");
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
                <h1>{mode === "register" ? "Create Account" : "Sign In"}</h1>
                {mode === "register" && (
                  <p className="auth-subtitle">Publisher Passport</p>
                )}
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
                    className={`input ${emailError ? "input-error" : ""}`}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    aria-required="true"
                    aria-label="Email address"
                    aria-invalid={!!emailError}
                  />
                  {emailError && <p className="field-error">{emailError}</p>}
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
                    <p className="form-hint">Your public publisher identity. 3-24 characters, letters, numbers, and hyphens.</p>
                  </div>
                )}

                {error && <div className="alert alert-error">{error}</div>}

                <div className="auth-flow-hint">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  <span>We&apos;ll send a one-time verification code to your email. No password needed — just check your inbox and enter the 6-digit code.</span>
                </div>

                <button onClick={handleSubmit} className="btn btn-full" disabled={loading || !email.trim() || (emailTouched && !!emailError)}>
                  {loading ? "Sending..." : mode === "register" ? "Get Verification Code" : "Send Login Code"}
                </button>

                <div className="centered-card-footer">
                  {mode === "register" ? (
                    <>Already have an account?{" "}
                      <button onClick={() => { setMode("login"); setError(""); setEmailTouched(false); }} className="btn-link">
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>First time?{" "}
                      <button onClick={() => { setMode("register"); setError(""); setEmailTouched(false); }} className="btn-link">
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
