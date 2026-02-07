export const sv = (k, d) => { try { localStorage.setItem("gt3-" + k, JSON.stringify(d)); } catch {} };
export const ld = (k, f) => { try { const d = localStorage.getItem("gt3-" + k); return d ? JSON.parse(d) : f; } catch { return f; } };
