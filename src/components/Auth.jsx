import { useState } from 'react';
import { supabase } from '../lib/supabase';

const Auth = () => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Check your email for a confirmation link, then log in.");
    }
    setLoading(false);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="auth-logo">
          <div className="auth-title">Golf Tracker</div>
          <div className="auth-sub">Track rounds, settle bets</div>
        </div>

        <div className="auth-card">
          <div className="tabs mb10">
            <button className={`tab ${mode === "login" ? "on" : ""}`} onClick={() => { setMode("login"); setError(null); setMessage(null); }}>Log In</button>
            <button className={`tab ${mode === "signup" ? "on" : ""}`} onClick={() => { setMode("signup"); setError(null); setMessage(null); }}>Sign Up</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb10">
              <div className="il">Email</div>
              <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
            </div>
            <div className="mb12">
              <div className="il">Password</div>
              <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === "signup" ? "Choose a password (6+ chars)" : "Your password"} required minLength={6} />
            </div>

            {error && <div className="auth-err">{error}</div>}
            {message && <div className="auth-msg">{message}</div>}

            <button type="submit" disabled={loading} className="btn bp">{loading ? "..." : mode === "login" ? "Log In" : "Create Account"}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
