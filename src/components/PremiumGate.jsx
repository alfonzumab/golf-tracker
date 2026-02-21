const PremiumGate = ({ profile, children }) => {
  if (profile?.subscription_tier === 'premium') {
    return children;
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="st-blur">
        {children}
      </div>
      <div className="st-lock">
        {/* Lock icon */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f0c040" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#f0c040', marginBottom: 8 }}>
          Premium Stats
        </div>
        <div style={{ fontSize: 13, color: '#6b9b7a', marginBottom: 16, lineHeight: 1.6 }}>
          <div>Detailed scoring analytics</div>
          <div>Skins breakdown by hole</div>
          <div>Head-to-head records</div>
          <div>Game profitability</div>
          <div>Course performance</div>
        </div>
        <button
          className="btn"
          style={{
            background: 'linear-gradient(135deg, #d4a017, #f0c040)',
            color: '#0b1a10',
            fontWeight: 700,
            fontSize: 14,
            minHeight: 44,
            cursor: 'default',
            opacity: 0.9,
          }}
        >
          Coming Soon
        </button>
      </div>
    </div>
  );
};

export default PremiumGate;
