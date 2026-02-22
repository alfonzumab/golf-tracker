import { useState } from 'react';
import { T } from '../theme';
import { supabase } from '../lib/supabase';

const FEATURES = [
  'Detailed scoring analytics',
  'Score distribution by par type & course',
  'Skins breakdown by hole',
  'Head-to-head records & partner stats',
  'Game profitability by type',
  'Course performance breakdown',
  'All-time records & streaks',
  'Earnings by player',
];

const Upgrade = ({ onBack }) => {
  const [loading, setLoading] = useState(null); // 'monthly' | 'annual' | null
  const [error, setError] = useState(null);

  const handleUpgrade = async (plan) => {
    setLoading(plan);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not logged in');

      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      window.location.href = data.url;
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div className="pg" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '20px 0 12px' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>⛳</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: T.gold }}>
          Unlock Premium Stats
        </div>
        <div style={{ fontSize: 14, color: T.dim, marginTop: 8, lineHeight: 1.6 }}>
          Advanced analytics to track every dollar and sharpen your game
        </div>
      </div>

      {/* Features list */}
      <div className="cd" style={{ marginBottom: 16 }}>
        {FEATURES.map((f, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0',
              borderBottom: i < FEATURES.length - 1 ? `1px solid ${T.bdr}` : 'none',
            }}
          >
            <span style={{ color: T.accB, fontSize: 16, flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: 14, color: T.txt }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Price cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {/* Annual card — highlighted */}
        <div
          className="cd"
          style={{
            flex: 1, margin: 0, textAlign: 'center', padding: '24px 12px',
            border: `2px solid ${T.gold}`, position: 'relative',
          }}
        >
          <div style={{
            position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
            background: T.gold, color: T.bg, fontSize: 11, fontWeight: 700,
            padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: '.5px',
          }}>
            SAVE 44%
          </div>
          <div style={{ fontSize: 11, color: T.dim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Annual</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: T.txt, lineHeight: 1.1 }}>
            $9.99
          </div>
          <div style={{ fontSize: 12, color: T.dim, marginBottom: 4 }}>per year</div>
          <div style={{ fontSize: 12, color: T.accB, fontWeight: 600, marginBottom: 20 }}>~$0.83/month</div>
          <button
            className="btn"
            onClick={() => handleUpgrade('annual')}
            disabled={!!loading}
            style={{
              width: '100%', minHeight: 44,
              background: loading === 'annual' ? T.mut : `linear-gradient(135deg, #d4a017, ${T.gold})`,
              color: T.bg, fontWeight: 700, fontSize: 14,
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading === 'annual' ? 'Redirecting...' : 'Get Premium'}
          </button>
        </div>

        {/* Monthly card */}
        <div
          className="cd"
          style={{ flex: 1, margin: 0, textAlign: 'center', padding: '24px 12px' }}
        >
          <div style={{ fontSize: 11, color: T.dim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Monthly</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: T.txt, lineHeight: 1.1 }}>
            $1.49
          </div>
          <div style={{ fontSize: 12, color: T.dim, marginBottom: 4 }}>per month</div>
          <div style={{ fontSize: 12, color: T.dim, marginBottom: 20 }}>Billed monthly</div>
          <button
            className="btn bs"
            onClick={() => handleUpgrade('monthly')}
            disabled={!!loading}
            style={{
              width: '100%', minHeight: 44, fontWeight: 700, fontSize: 14,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading === 'monthly' ? 'Redirecting...' : 'Get Premium'}
          </button>
        </div>
      </div>

      {error && (
        <div className="auth-err" style={{ marginBottom: 12 }}>{error}</div>
      )}

      <div style={{ fontSize: 12, color: T.dim, textAlign: 'center', marginBottom: 20 }}>
        Cancel anytime · Secure payment via Stripe
      </div>

      <button
        className="btn bs"
        onClick={onBack}
        style={{ width: '100%' }}
      >
        Maybe Later
      </button>
    </div>
  );
};

export default Upgrade;
