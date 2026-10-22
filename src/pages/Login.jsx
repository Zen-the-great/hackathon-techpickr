import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { supabase } from "../supabaseClient.js";
import "./Auth.css";

function describeAuthError(error) {
  const code = error?.code || error?.message || "";
  if (/email_not_confirmed/i.test(code)) return "Confirm your email address using the link we sent, then log in.";
  if (/invalid login credentials/i.test(code)) return "Email or password is incorrect.";
  if (/user already registered/i.test(code)) return "An account already exists for this email. Log in instead.";
  if (/password/i.test(code) && /length|characters|weak/i.test(code)) return "Choose a stronger password with at least 8 characters.";
  return error?.message || "Authentication failed. Please try again.";
}

export default function Login() {
  const { user, loading, configured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const returnTo = location.state?.returnTo || "/my-recommendations";
  const postLoginDestination = returnTo === "/results"
    ? "/my-recommendations"
    : returnTo;
  const googleEnabled = import.meta.env.VITE_SUPABASE_GOOGLE_AUTH_ENABLED === "true";

  if (!loading && user) return <Navigate to={postLoginDestination} replace />;

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!supabase) {
      setError("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: name.trim() ? { display_name: name.trim() } : {} },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage("Registration received. Check your email to confirm your account, then log in.");
        } else {
          navigate(postLoginDestination, { replace: true });
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        navigate(postLoginDestination, { replace: true });
      }
    } catch (authError) {
      setError(describeAuthError(authError));
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setError("");
    if (!supabase) {
      setError("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}my-recommendations`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (oauthError) throw oauthError;
    } catch (authError) {
      setError(describeAuthError(authError));
      setBusy(false);
    }
  }

  return (
    <main className="container account-page">
      <section className="account-card">
        <p className="pc-builder-eyebrow">TECHPICKR / ACCOUNT</p>
        <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p>Sign in to save and view your recommendations on any device.</p>
        {!configured && <p className="account-error" role="alert">Supabase authentication is not configured. Add the frontend Supabase variables and restart Vite.</p>}
        <form className="account-form" onSubmit={submit}>
          {mode === "signup" && (
            <label>
              Display name (optional)
              <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
            </label>
          )}
          <label>
            Email
            <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} />
          </label>
          <label>
            Password
            <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} />
          </label>
          <button className="account-submit" type="submit" disabled={busy || loading}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
        {googleEnabled && (
          <>
            <div className="account-google-separator">or</div>
            <button className="account-google" type="button" onClick={signInWithGoogle} disabled={busy || loading}>
              Continue with Google
            </button>
          </>
        )}
        {message && <p className="account-message" role="status">{message}</p>}
        {error && <p className="account-error" role="alert">{error}</p>}
        <p className="account-switch">
          {mode === "login" ? "New to TechPickr? " : "Already have an account? "}
          <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
        <p className="account-switch"><Link to="/" className="account-link">Back to TechPickr</Link></p>
      </section>
    </main>
  );
}
