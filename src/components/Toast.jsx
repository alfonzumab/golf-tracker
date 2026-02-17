import { useState, useEffect, useCallback } from 'react';
import { T } from '../theme';
import { subscribe } from '../utils/toast';

const typeStyles = {
  error:   { bg: T.redD, border: T.red, icon: '✕' },
  warning: { bg: '#5f3d1d', border: T.gold, icon: '⚠' },
  success: { bg: T.accD, border: T.acc, icon: '✓' },
  info:    { bg: T.card, border: T.blue, icon: 'ℹ' }
};

export default function Toast({ duration = 4000 }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((t) => {
    setToasts(prev => [...prev, t]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), duration);
  }, [duration]);

  useEffect(() => subscribe(addToast), [addToast]);

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8,
      width: '90%', maxWidth: 440, pointerEvents: 'none'
    }}>
      {toasts.map(t => {
        const s = typeStyles[t.type] || typeStyles.info;
        return (
          <div key={t.id} style={{
            background: s.bg, borderLeft: `3px solid ${s.border}`,
            borderRadius: 8, padding: '12px 16px', color: T.txt,
            fontSize: 14, fontFamily: "'DM Sans', sans-serif",
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,.4)', pointerEvents: 'auto',
            animation: 'toastIn .25s ease-out'
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <span
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              style={{ cursor: 'pointer', color: T.dim, fontSize: 18, padding: '0 4px' }}
            >×</span>
          </div>
        );
      })}
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateY(-12px) } to { opacity:1; transform:translateY(0) }}`}</style>
    </div>
  );
}
