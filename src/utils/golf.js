export const calcCH = (idx, sl, rt, par) => (!sl || !rt) ? 0 : Math.round((idx || 0) * (sl / 113) + (rt - par));

export const getStrokes = (ch, hcps) => {
  const s = Array(18).fill(0), abs = Math.abs(ch), sign = ch >= 0 ? 1 : -1;
  const sorted = hcps.map((h, i) => ({ h: i, hcp: h })).sort((a, b) => a.hcp - b.hcp);
  const full = Math.floor(abs / 18), rem = abs % 18;
  for (let i = 0; i < 18; i++) s[i] = full * sign;
  for (let i = 0; i < rem; i++) s[sorted[i].h] += sign;
  return s;
};

export const sixPairs = () => {
  const allPairs = [
    { t1: [0, 1], t2: [2, 3], l: "1-6" },
    { t1: [0, 2], t2: [1, 3], l: "7-12" },
    { t1: [0, 3], t2: [1, 2], l: "13-18" },
    { t1: [1, 2], t2: [0, 3], l: "" },
    { t1: [1, 3], t2: [0, 2], l: "" },
    { t1: [2, 3], t2: [0, 1], l: "" }
  ];
  const shuffled = [...allPairs].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);
  selected[0].s = 0; selected[0].e = 5; selected[0].l = "1-6";
  selected[1].s = 6; selected[1].e = 11; selected[1].l = "7-12";
  selected[2].s = 12; selected[2].e = 17; selected[2].l = "13-18";
  return selected;
};

export const fmt$ = n => Math.abs(n) < 0.005 ? "$0" : (n >= 0 ? "+" : "-") + "$" + Math.abs(n).toFixed(2).replace(/\.00$/, "");

export const scoreClass = (s, p) => { if (s == null) return ""; const d = s - p; return d <= -2 ? "eagle" : d === -1 ? "birdie" : d === 0 ? "" : d === 1 ? "bogey" : "dbl"; };

export const enrichPlayer = (p, teeData) => {
  const tp = teeData.pars.reduce((a, b) => a + b, 0);
  const ch = calcCH(p.index, teeData.slope, teeData.rating, tp);
  return { ...p, teeData, courseHandicap: ch, strokeHoles: getStrokes(ch, teeData.handicaps) };
};
