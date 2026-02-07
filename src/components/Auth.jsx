import { useState } from 'react';
import { T } from '../theme';
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
    <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: T.accB }}>Golf Tracker</div>
          <div style={{ fontSize: 12, color: T.dim, marginTop: 4 }}>Track rounds, settle bets</div>
        </div>

        <div style={{ background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", gap: 2, background: T.inp, borderRadius: 8, padding: 2, marginBottom: 16 }}>
            <button
              onClick={() => { setMode("login"); setError(null); setMessage(null); }}
              style={{ flex: 1, padding: "8px 4px", border: "none", background: mode === "login" ? T.accD + "44" : "none", color: mode === "login" ? T.accB : T.dim, fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer" }}
            >Log In</button>
            <button
              onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
              style={{ flex: 1, padding: "8px 4px", border: "none", background: mode === "signup" ? T.accD + "44" : "none", color: mode === "signup" ? T.accB : T.dim, fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer" }}
            >Sign Up</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: T.dim, marginBottom: 3, fontWeight: 500 }}>Email</div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                style={{ width: "100%", background: T.inp, border: `1px solid ${T.bdr}`, color: T.txt, padding: "9px 10px", borderRadius: 7, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: T.dim, marginBottom: 3, fontWeight: 500 }}>Password</div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Choose a password (6+ chars)" : "Your password"}
                required
                minLength={6}
                style={{ width: "100%", background: T.inp, border: `1px solid ${T.bdr}`, color: T.txt, padding: "9px 10px", borderRadius: 7, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {error && <div style={{ background: T.red + "15", color: T.red, padding: 8, borderRadius: 7, fontSize: 11, marginBottom: 12 }}>{error}</div>}
            {message && <div style={{ background: T.accD + "22", color: T.accB, padding: 8, borderRadius: 7, fontSize: 11, marginBottom: 12 }}>{message}</div>}

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "11px 16px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${T.acc}, ${T.accD})`, color: T.bg, fontSize: 13, fontWeight: 600, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}
            >{loading ? "..." : mode === "login" ? "Log In" : "Create Account"}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
