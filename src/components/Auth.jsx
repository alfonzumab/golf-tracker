import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const Auth = () => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // PWA install state
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // OAuth will redirect, so no need to setLoading(false) here
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      setError("Please enter your email address");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Check your email for a password reset link!");
    }
    setLoading(false);
  };

  // PWA install detection
  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone ||
                      document.referrer.includes('android-app://');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(standalone);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Listen for install prompt (Android/Chrome/Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    
    setDeferredPrompt(null);
  };

  // iOS install instructions modal
  if (showIOSInstructions) {
    return (
      <div className="auth-wrap">
        <div className="auth-box">
          <div className="auth-logo">
            <div className="auth-title">Settle Up Golf</div>
            <div className="auth-sub">Track rounds, settle bets</div>
          </div>

          <div className="auth-card">
            <div className="ct">Install on iOS</div>
            <div style={{ fontSize: 14, color: '#6b9b7a', marginBottom: 16, lineHeight: 1.6 }}>
              To install this app on your iPhone or iPad:
              <ol style={{ marginTop: 12, paddingLeft: 20 }}>
                <li style={{ marginBottom: 8 }}>Tap the <strong>Share</strong> button <span style={{ fontSize: 18 }}>⎋</span> in Safari</li>
                <li style={{ marginBottom: 8 }}>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong> in the top right</li>
              </ol>
            </div>

            <button 
              type="button" 
              onClick={() => setShowIOSInstructions(false)}
              className="btn bp"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If showing forgot password form
  if (showForgotPassword) {
    return (
      <div className="auth-wrap">
        <div className="auth-box">
          <div className="auth-logo">
            <div className="auth-title">Settle Up Golf</div>
            <div className="auth-sub">Track rounds, settle bets</div>
          </div>

          <div className="auth-card">
            <div className="ct">Reset Password</div>
            <div style={{ fontSize: 14, color: '#6b9b7a', marginBottom: 16 }}>
              Enter your email and we'll send you a link to reset your password.
            </div>

            <div className="mb12">
              <div className="il">Email</div>
              <input 
                className="inp" 
                type="email" 
                value={resetEmail} 
                onChange={e => setResetEmail(e.target.value)} 
                placeholder="you@email.com" 
              />
            </div>

            {error && <div className="auth-err">{error}</div>}
            {message && <div className="auth-msg">{message}</div>}

            <button 
              type="button" 
              onClick={handleForgotPassword} 
              disabled={loading} 
              className="btn bp"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button 
                type="button"
                onClick={() => { setShowForgotPassword(false); setError(null); setMessage(null); }}
                style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontSize: 14 }}
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="auth-logo">
          <div className="auth-title">Settle Up Golf</div>
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

          {mode === "login" && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button 
                type="button"
                onClick={() => setShowForgotPassword(true)}
                style={{ background: 'none', border: 'none', color: '#6b9b7a', cursor: 'pointer', fontSize: 13 }}
              >
                Forgot Password?
              </button>
            </div>
          )}

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button onClick={handleGoogleSignIn} disabled={loading} className="btn google-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? "..." : "Continue with Google"}
          </button>

          {/* PWA Install Button */}
          {!isStandalone && (isInstallable || isIOS) && (
            <>
              <div className="auth-divider">
                <span>or</span>
              </div>
              <button 
                onClick={handleInstallClick} 
                className="btn bs"
                style={{ 
                  background: '#4ade80', 
                  color: '#0b1a10', 
                  border: 'none',
                  fontWeight: 600
                }}
              >
                📱 {isIOS ? 'Add to Home Screen' : 'Install App'}
              </button>
              <div style={{ fontSize: 12, color: '#6b9b7a', textAlign: 'center', marginTop: 8 }}>
                Install for offline access & faster loading
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
