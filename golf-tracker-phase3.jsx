import { useState, useEffect, useMemo } from "react";

const GT = { STROKE: "stroke", MATCH: "match", SKINS: "skins", SIXES: "sixes" };
const PC = ["#4ade80", "#60a5fa", "#f0c040", "#f472b6"];

// -- Storage --
const sv = (k, d) => { try { localStorage.setItem("gt3-" + k, JSON.stringify(d)); } catch {} };
const ld = (k, f) => { try { const d = localStorage.getItem("gt3-" + k); return d ? JSON.parse(d) : f; } catch { return f; } };

const calcCH = (idx, sl, rt, par) => (!sl || !rt) ? 0 : Math.round((idx || 0) * (sl / 113) + (rt - par));
const getStrokes = (ch, hcps) => {
  const s = Array(18).fill(0), abs = Math.abs(ch), sign = ch >= 0 ? 1 : -1;
  const sorted = hcps.map((h, i) => ({ h: i, hcp: h })).sort((a, b) => a.hcp - b.hcp);
  const full = Math.floor(abs / 18), rem = abs % 18;
  for (let i = 0; i < 18; i++) s[i] = full * sign;
  for (let i = 0; i < rem; i++) s[sorted[i].h] += sign;
  return s;
};
const sixPairs = () => {
  // All possible unique pairings (6 total combinations)
  const allPairs = [
    { t1: [0, 1], t2: [2, 3], l: "1-6" },
    { t1: [0, 2], t2: [1, 3], l: "7-12" },
    { t1: [0, 3], t2: [1, 2], l: "13-18" },
    { t1: [1, 2], t2: [0, 3], l: "" },
    { t1: [1, 3], t2: [0, 2], l: "" },
    { t1: [2, 3], t2: [0, 1], l: "" }
  ];
  
  // Shuffle and pick first 3
  const shuffled = [...allPairs].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);
  
  // Assign hole ranges
  selected[0].s = 0; selected[0].e = 5; selected[0].l = "1-6";
  selected[1].s = 6; selected[1].e = 11; selected[1].l = "7-12";
  selected[2].s = 12; selected[2].e = 17; selected[2].l = "13-18";
  
  return selected;
};
const fmt$ = n => Math.abs(n) < 0.005 ? "$0" : (n >= 0 ? "+" : "-") + "$" + Math.abs(n).toFixed(2).replace(/\.00$/, "");
const scoreClass = (s, p) => { if (s == null) return ""; const d = s - p; return d <= -2 ? "eagle" : d === -1 ? "birdie" : d === 0 ? "" : d === 1 ? "bogey" : "dbl"; };

// -- Theme --
const T = {
  bg: "#0b1a10", card: "#0f2518", cardHi: "#143020", inp: "#081510",
  acc: "#2ecc71", accD: "#1a7a42", accB: "#4ade80",
  gold: "#f0c040", red: "#ef4444", redD: "#7f1d1d", blue: "#60a5fa",
  txt: "#e8f5e9", dim: "#6b9b7a", mut: "#3d6b50", bdr: "#1a3a25", bdrL: "#2a5a3a"
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@400;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
body{font-family:'DM Sans',sans-serif;background:${T.bg};color:${T.txt};min-height:100vh;overflow-x:hidden}
input,select,button{font-family:inherit}
.app{max-width:480px;margin:0 auto;min-height:100vh}
.hdr{background:${T.card}ee;border-bottom:1px solid ${T.bdr};padding:14px 16px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:100;backdrop-filter:blur(12px)}
.hdr-t{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:${T.accB}}
.hdr-s{font-size:11px;color:${T.dim};margin-top:1px}
.hdr-bk{background:none;border:1px solid ${T.bdr};color:${T.accB};width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;flex-shrink:0}
.pg{padding:12px 16px 90px;animation:fi .2s ease}
@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.cd{background:${T.card};border:1px solid ${T.bdr};border-radius:12px;padding:14px;margin-bottom:10px}
.ct{font-family:'Playfair Display',serif;font-size:15px;font-weight:600;color:${T.accB};margin-bottom:10px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;border-radius:8px;border:none;font-size:13px;font-weight:600;cursor:pointer;width:100%;transition:transform .1s}
.btn:active{transform:scale(.97)}
.bp{background:linear-gradient(135deg,${T.acc},${T.accD});color:${T.bg}}
.bs{background:${T.card};color:${T.accB};border:1px solid ${T.bdr}}
.bd{background:${T.redD};color:#fff}
.bsm{padding:7px 12px;font-size:11px;width:auto}
.bg{background:none;border:1px solid ${T.bdr};color:${T.dim};padding:7px 12px;font-size:11px;width:auto}
.bg:disabled{opacity:.3}
.il{font-size:11px;color:${T.dim};margin-bottom:3px;font-weight:500}
.inp{width:100%;background:${T.inp};border:1px solid ${T.bdr};color:${T.txt};padding:9px 10px;border-radius:7px;font-size:13px;outline:none}
.inp:focus{border-color:${T.acc}}
.ism{padding:5px 6px;font-size:12px;text-align:center;width:56px}
select.inp{appearance:none;cursor:pointer}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.fx{display:flex;align-items:center}.fxb{display:flex;align-items:center;justify-content:space-between}
.fw{flex-wrap:wrap}.g6{gap:6px}.g8{gap:8px}
.mb6{margin-bottom:6px}.mb8{margin-bottom:8px}.mb10{margin-bottom:10px}.mb12{margin-bottom:12px}.mt8{margin-top:8px}.mt10{margin-top:10px}
.tag{display:inline-flex;align-items:center;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:600}
.tg{background:${T.accD}33;color:${T.accB}}.ty{background:${T.gold}22;color:${T.gold}}.tr{background:${T.red}22;color:${T.red}}
.dvd{height:1px;background:${T.bdr};margin:10px 0}
.sct{width:100%;border-collapse:collapse;font-size:11px}
.sct th,.sct td{padding:3px 2px;text-align:center;border:1px solid ${T.bdr};min-width:26px}
.sct th{background:${T.card};color:${T.dim};font-weight:600;font-size:9px}
.sct .hn{color:${T.accB};font-weight:700}.sct .tc{background:${T.card};font-weight:700}
.si{width:100%;background:transparent;border:none;color:${T.txt};text-align:center;font-size:12px;font-weight:600;padding:3px 0;outline:none}
.si:focus{background:${T.accD}33}
.sc{position:relative;cursor:pointer}
.sd{position:absolute;top:1px;right:1px;width:5px;height:5px;border-radius:50%;background:${T.gold}}
.sd2{position:absolute;top:1px;left:1px;width:5px;height:5px;border-radius:50%;background:${T.gold}}
.birdie{color:${T.accB}!important}.bogey{color:${T.gold}!important}.dbl{color:${T.red}!important}.eagle{color:${T.blue}!important}
.sr{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:7px;margin-bottom:5px;font-size:12px;font-weight:600}
.sp{background:${T.accD}22;color:${T.accB}}.sn{background:${T.red}15;color:${T.red}}.su{background:${T.bdr}44;color:${T.dim}}
.tabs{display:flex;gap:2px;background:${T.inp};border-radius:8px;padding:2px;margin-bottom:12px}
.tab{flex:1;padding:7px 4px;border:none;background:none;color:${T.dim};font-size:11px;font-weight:600;border-radius:6px;cursor:pointer}
.tab.on{background:${T.accD}44;color:${T.accB}}
.tgr{display:flex;align-items:center;justify-content:space-between;padding:6px 0}
.tgl{font-size:12px;color:${T.txt}}
.tgb{width:40px;height:22px;border-radius:11px;border:none;cursor:pointer;position:relative;transition:background .2s}
.tgb.on{background:${T.acc}}.tgb.off{background:${T.mut}}
.tgk{position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:2px;transition:left .2s}
.tgb.on .tgk{left:20px}.tgb.off .tgk{left:2px}
.nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:${T.card}f5;border-top:1px solid ${T.bdr};display:flex;padding:6px 0;padding-bottom:max(6px,env(safe-area-inset-bottom));z-index:100;backdrop-filter:blur(12px)}
.ni{flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;padding:4px 0;border:none;background:none;color:${T.mut};font-size:9px;font-weight:600;cursor:pointer}
.ni.on{color:${T.accB}}.nii{font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center}
.sw{overflow-x:auto;margin:0 -14px;padding:0 14px}.sw::-webkit-scrollbar{display:none}
.pc0{color:#4ade80}.pc1{color:#60a5fa}.pc2{color:#f0c040}.pc3{color:#f472b6}
.pb0{background:#4ade8012}.pb1{background:#60a5fa12}.pb2{background:#f0c04012}.pb3{background:#f472b612}
.chip{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:16px;font-size:11px;font-weight:600;border:1px solid ${T.bdr};cursor:pointer}
.chip.sel{border-color:${T.acc};background:${T.accD}33}
.mbg{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.mdl{background:${T.card};border:1px solid ${T.bdrL};border-radius:14px;padding:20px;max-width:360px;width:100%}
.mdt{font-family:'Playfair Display',serif;font-size:16px;font-weight:600;color:${T.accB};margin-bottom:12px}
.mdtx{font-size:13px;color:${T.dim};margin-bottom:16px;line-height:1.5;white-space:pre-line}
.tk{background:${T.card};border:1px solid ${T.bdr};border-radius:10px;padding:10px 12px;margin-bottom:10px}
.tkt{font-size:10px;font-weight:600;color:${T.mut};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.tkr{display:flex;align-items:center;justify-content:space-between;padding:3px 0;font-size:12px}
.hs{display:flex;flex-wrap:wrap;gap:3px;justify-content:center;margin-top:12px}
.hb{width:26px;height:26px;border-radius:50%;border:1px solid ${T.bdr};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;cursor:pointer;background:transparent;color:${T.dim}}
.hb.cur{border-color:${T.acc};color:${T.accB};background:${T.accD}22}
.hb.done{background:${T.accD}33;color:${T.acc}}
.sec{border-radius:10px;padding:10px;margin-bottom:8px;border:1px solid ${T.bdr}}
.seb{width:40px;height:40px;border-radius:8px;border:1px solid ${T.bdr};background:${T.card};color:${T.txt};font-size:18px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center}
.seb:active{background:${T.cardHi}}
.sev{width:52px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:${T.inp};border:1.5px solid ${T.bdr};font-size:20px;font-weight:700}
.secl{width:32px;height:40px;border:none;background:none;color:${T.dim};font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center}
.empty-i{font-size:48px;margin-bottom:12px;opacity:0.5}
.empty-t{font-size:14px;color:${T.dim};font-weight:500}
.prow{display:flex;align-items:center;gap:8px;padding:10px 12px;background:${T.card};border:1px solid ${T.bdr};border-radius:8px;margin-bottom:6px}
.prow-n{flex:1;font-weight:600;font-size:13px}
.prow-i{font-size:11px;color:${T.dim}}
`;

// -- Calc Engine --
function calcAll(games, players) {
  if (!games || !players || players.length < 4) return { results: [], settlements: [], balances: [0,0,0,0] };
  const res = [], led = Array.from({ length: 4 }, () => Array(4).fill(0));
  const pay = (f, t, a) => { if (f !== t && a > 0.005) led[f][t] += a; };
  for (const g of games) {
    let r;
    if (g.type === GT.STROKE) r = cStroke(g, players);
    else if (g.type === GT.MATCH) r = cMatch(g, players);
    else if (g.type === GT.SKINS) r = cSkins(g, players);
    else if (g.type === GT.SIXES) r = cSixes(g, players);
    if (r) { res.push(r); (r.payouts || []).forEach(p => pay(p.f, p.t, p.a)); }
  }
  const bal = Array(4).fill(0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (i !== j) bal[i] += led[i][j] - led[j][i];
  const sett = [], deb = [], crd = [];
  for (let i = 0; i < 4; i++) { if (bal[i] > 0.01) deb.push({ i, a: bal[i] }); else if (bal[i] < -0.01) crd.push({ i, a: -bal[i] }); }
  deb.sort((a, b) => b.a - a.a); crd.sort((a, b) => b.a - a.a);
  let di = 0, ci = 0;
  while (di < deb.length && ci < crd.length) {
    const a = Math.min(deb[di].a, crd[ci].a);
    if (a > 0.01) sett.push({ from: deb[di].i, to: crd[ci].i, amount: Math.round(a * 100) / 100 });
    deb[di].a -= a; crd[ci].a -= a;
    if (deb[di].a < 0.01) di++; if (crd[ci].a < 0.01) ci++;
  }
  return { results: res, settlements: sett, balances: bal };
}

function cStroke(g, pl) {
  const n = pl.map(p => p.name.split(" ")[0]);
  
  // 2v2 Team format
  if (g.team1 && g.team2) {
    const t1 = g.team1, t2 = g.team2;
    const t1N = n[t1[0]] + "&" + n[t1[1]], t2N = n[t2[0]] + "&" + n[t2[1]];
    
    const calcTeamScore = (team, start, end) => {
      let total = 0, holes = 0;
      for (let h = start; h < end; h++) {
        if (team.every(i => pl[i].scores[h] != null)) {
          const scores = team.map(i => g.net ? pl[i].scores[h] - pl[i].strokeHoles[h] : pl[i].scores[h]);
          total += Math.min(...scores);
          holes++;
        }
      }
      return { total, holes };
    };
    
    const fr1 = calcTeamScore(t1, 0, 9), fr2 = calcTeamScore(t2, 0, 9);
    const bk1 = calcTeamScore(t1, 9, 18), bk2 = calcTeamScore(t2, 9, 18);
    const ov1 = { total: fr1.total + bk1.total, holes: fr1.holes + bk1.holes };
    const ov2 = { total: fr2.total + bk2.total, holes: fr2.holes + bk2.holes };
    
    const fs = (s1, s2, l) => {
      if (s1.holes === 0) return l + ": --";
      if (s1.total < s2.total) return l + ": " + t1N + " (" + s1.total + ")";
      if (s2.total < s1.total) return l + ": " + t2N + " (" + s2.total + ")";
      return l + ": Tie (" + s1.total + ")";
    };
    
    const pay = [];
    const pm = (s1, s2, w) => {
      if (s1.holes === 0) return;
      if (s1.total < s2.total) { for (const loser of t2) for (const winner of t1) pay.push({ f: loser, t: winner, a: w }); }
      else if (s2.total < s1.total) { for (const loser of t1) for (const winner of t2) pay.push({ f: loser, t: winner, a: w }); }
    };
    
    if (fr1.holes > 0) pm(fr1, fr2, g.wagerFront);
    if (bk1.holes > 0) pm(bk1, bk2, g.wagerBack);
    if (ov1.holes === 18 && ov1.total !== ov2.total) pm(ov1, ov2, g.wagerOverall);
    
    let st = "";
    if (ov1.holes > 0) {
      const rem = 18 - ov1.holes;
      if (rem > 0) {
        const diff = ov1.total - ov2.total;
        if (diff < 0) st = t1N + " -" + Math.abs(diff) + " (" + rem + " left)";
        else if (diff > 0) st = t2N + " -" + Math.abs(diff) + " (" + rem + " left)";
        else st = "Tied (" + rem + " left)";
      } else {
        if (ov1.total < ov2.total) st = t1N + " WIN " + ov1.total + "-" + ov2.total;
        else if (ov2.total < ov1.total) st = t2N + " WIN " + ov2.total + "-" + ov1.total;
        else st = "TIED " + ov1.total;
      }
    }
    
    return { title: "Stroke 2v2 (" + (g.net ? "Net" : "Gross") + " BB)", details: [t1N + " vs " + t2N, fs(fr1, fr2, "F9"), fs(bk1, bk2, "B9"), fs(ov1, ov2, "18")], status: st, payouts: pay, wager: "$" + g.wagerFront + "/$" + g.wagerBack + "/$" + g.wagerOverall };
  }
  
  // Individual format (original)
  const d = pl.map((p, i) => {
    const h = p.scores.filter(s => s != null), gr = h.reduce((a, b) => a + b, 0);
    return { i, gr, net: gr - p.courseHandicap, h: h.length, ch: p.courseHandicap, n: n[i] };
  });
  if (!d.some(x => x.h > 0)) return { title: "Stroke (" + (g.net ? "Net" : "Gross") + ")", details: ["No scores"], payouts: [], wager: "$" + g.wagerPerPlayer + "/pl" };
  const sorted = [...d].sort((a, b) => g.net ? a.net - b.net : a.gr - b.gr);
  const det = d.map(x => x.n + ": " + x.gr + (g.net ? " (net " + x.net + ", CH " + x.ch + ")" : "") + " " + x.h + "/18");
  const pay = [];
  if (d.every(x => x.h === 18)) {
    const m = d.map(x => g.net ? x.net : x.gr), best = Math.min(...m);
    const winners = d.filter((_, i) => m[i] === best), losers = d.filter((_, i) => m[i] !== best);
    for (const loser of losers) { for (const winner of winners) pay.push({ f: loser.i, t: winner.i, a: g.wagerPerPlayer / winners.length }); }
  }
  return { title: "Stroke (" + (g.net ? "Net" : "Gross") + ")", details: det, status: "Leader: " + sorted[0].n + " (" + (g.net ? "net " + sorted[0].net : sorted[0].gr) + ")", payouts: pay, wager: "$" + g.wagerPerPlayer + "/pl" };
}

function cMatch(g, pl) {
  const n = pl.map(p => p.name.split(" ")[0]), t1 = g.team1, t2 = g.team2;
  const t1N = n[t1[0]] + "&" + n[t1[1]], t2N = n[t2[0]] + "&" + n[t2[1]];
  const seg = (s, e) => {
    let w1 = 0, w2 = 0, p = 0;
    for (let h = s; h < e; h++) {
      if (!pl.every(x => x.scores[h] != null)) continue; p++;
      const b1 = Math.min(...t1.map(i => pl[i].scores[h] - pl[i].strokeHoles[h]));
      const b2 = Math.min(...t2.map(i => pl[i].scores[h] - pl[i].strokeHoles[h]));
      if (b1 < b2) w1++; else if (b2 < b1) w2++;
    } return { w1, w2, p };
  };
  const fr = seg(0, 9), bk = seg(9, 18), ov = { w1: fr.w1 + bk.w1, w2: fr.w2 + bk.w2, p: fr.p + bk.p };
  const fs = (s, l) => { if (!s.p) return l + ": --"; if (s.w1 > s.w2) return l + ": " + t1N + " (" + s.w1 + "-" + s.w2 + ")"; if (s.w2 > s.w1) return l + ": " + t2N + " (" + s.w2 + "-" + s.w1 + ")"; return l + ": Push"; };
  const pay = [];
  const pm = (s, w) => {
    if (s.w1 > s.w2) { for (const loser of t2) for (const winner of t1) pay.push({ f: loser, t: winner, a: w }); }
    else if (s.w2 > s.w1) { for (const loser of t1) for (const winner of t2) pay.push({ f: loser, t: winner, a: w }); }
  };
  // Only pay front/back if played, and overall only if someone wins overall 18
  if (fr.p > 0) pm(fr, g.wagerFront);
  if (bk.p > 0) pm(bk, g.wagerBack);
  // Overall bet only pays if the 18-hole match is won (not a tie)
  if (ov.p === 18 && ov.w1 !== ov.w2) pm(ov, g.wagerOverall);
  let st = "";
  if (ov.p > 0) {
    const d = ov.w1 - ov.w2, r = 18 - ov.p;
    if (r > 0) { if (d > 0) st = t1N + " " + d + "UP (" + r + " left)"; else if (d < 0) st = t2N + " " + (-d) + "UP (" + r + " left)"; else st = "AS (" + r + " left)"; }
    else { if (d > 0) st = t1N + " WIN " + ov.w1 + "-" + ov.w2; else if (d < 0) st = t2N + " WIN " + ov.w2 + "-" + ov.w1; else st = "HALVED"; }
  }
  return { title: "Match (2v2 BB)", details: [t1N + " vs " + t2N, fs(fr, "F9"), fs(bk, "B9"), fs(ov, "18")], status: st, payouts: pay, wager: "$" + g.wagerFront + "/$" + g.wagerBack + "/$" + g.wagerOverall };
}

function cSkins(g, pl) {
  const n = pl.map(p => p.name.split(" ")[0]), cnt = [0, 0, 0, 0], hr = [];
  let carry = 0;
  for (let h = 0; h < 18; h++) {
    if (!pl.every(p => p.scores[h] != null)) { hr.push({ h: h + 1, r: "--", w: null, v: 0 }); continue; }
    const sc = pl.map((p, i) => ({ i, net: g.net ? p.scores[h] - p.strokeHoles[h] : p.scores[h] }));
    const best = Math.min(...sc.map(s => s.net)), wins = sc.filter(s => s.net === best);
    if (wins.length === 1) { const v = 1 + carry; cnt[wins[0].i] += v; hr.push({ h: h + 1, r: n[wins[0].i], w: wins[0].i, v }); carry = 0; }
    else { if (g.carryOver) { carry++; hr.push({ h: h + 1, r: "C", w: null, v: 0 }); } else hr.push({ h: h + 1, r: "P", w: null, v: 0 }); }
  }
  const ts = cnt.reduce((a, b) => a + b, 0), pot = g.potPerPlayer * 4, ps = ts > 0 ? pot / ts : 0;
  const pay = [];
  if (ts > 0) {
    const earn = cnt.map(c => c * ps), ne = earn.map(e => e - g.potPerPlayer);
    const tw = ne.filter(x => x > 0).reduce((a, b) => a + b, 0);
    if (tw > 0) for (let i = 0; i < 4; i++) { if (ne[i] >= 0) continue; for (let j = 0; j < 4; j++) { if (ne[j] <= 0) continue; const sh = (ne[j] / tw) * Math.abs(ne[i]); if (sh > 0.01) pay.push({ f: i, t: j, a: sh }); } }
  }
  const det = ["Pot: $" + pot + " | " + ts + " skin" + (ts !== 1 ? "s" : "") + (ts > 0 ? " | $" + ps.toFixed(2) + "/skin" : ""),
    ...n.map((nm, i) => nm + ": " + cnt[i] + " ($" + (cnt[i] * ps).toFixed(2) + ")")];
  return { title: "Skins (" + (g.net ? "Net" : "Gross") + (g.carryOver ? ", Carry" : "") + ")", details: det, status: carry > 0 ? carry + " carrying" : null, payouts: pay, holeResults: hr, wager: "$" + g.potPerPlayer + "/pl" };
}

function cSixes(g, pl) {
  const n = pl.map(p => p.name.split(" ")[0]);
  const pairs = g.pairs || sixPairs(); // Use stored pairs or generate new ones
  const det = [], pay = [];
  const segmentScores = []; // Track scores for live display
  
  for (const pr of pairs) {
    const t1 = pr.t1, t2 = pr.t2;
    const t1N = n[t1[0]] + "&" + n[t1[1]], t2N = n[t2[0]] + "&" + n[t2[1]];
    let s1 = 0, s2 = 0, played = 0;
    for (let h = pr.s; h <= pr.e; h++) {
      if (!pl.every(p => p.scores[h] != null)) continue; played++;
      if (g.mode === "match") {
        const b1 = Math.min(...t1.map(i => pl[i].scores[h] - pl[i].strokeHoles[h]));
        const b2 = Math.min(...t2.map(i => pl[i].scores[h] - pl[i].strokeHoles[h]));
        if (b1 < b2) s1++; else if (b2 < b1) s2++;
      } else {
        s1 += t1.reduce((a, i) => a + pl[i].scores[h] - pl[i].strokeHoles[h], 0);
        s2 += t2.reduce((a, i) => a + pl[i].scores[h] - pl[i].strokeHoles[h], 0);
      }
    }
    
    let w = null, r;
    if (!played) r = "--";
    else if (g.mode === "match") { if (s1 > s2) { r = t1N + " WIN " + s1 + "-" + s2; w = "t1"; } else if (s2 > s1) { r = t2N + " WIN " + s2 + "-" + s1; w = "t2"; } else r = "Push"; }
    else { if (s1 < s2) { r = t1N + " WIN"; w = "t1"; } else if (s2 < s1) { r = t2N + " WIN"; w = "t2"; } else r = "Push"; }
    
    det.push(pr.l + ": " + t1N + " vs " + t2N + " \u2192 " + r);
    segmentScores.push({ t1, t2, t1N, t2N, s1, s2, played, holes: pr.e - pr.s + 1, range: pr.l, winner: w });
    
    const wg = g.wagerPerSegment;
    if (w === "t1") { for (const loser of t2) for (const winner of t1) pay.push({ f: loser, t: winner, a: wg }); }
    else if (w === "t2") { for (const loser of t1) for (const winner of t2) pay.push({ f: loser, t: winner, a: wg }); }
  }
  
  return { title: "6-6-6 (" + (g.mode === "match" ? "Match" : "Stroke") + ")", details: det, payouts: pay, wager: "$" + g.wagerPerSegment + "/seg", pairs, segmentScores };
}

// -- Components --
const Tog = ({ v, onChange, label }) => (
  <div className="tgr"><span className="tgl">{label}</span>
    <button className={`tgb ${v ? "on" : "off"}`} onClick={() => onChange(!v)}><div className="tgk" /></button>
  </div>
);

const Mdl = ({ title, text, onOk, onNo, okTxt = "Confirm", danger }) => (
  <div className="mbg" onClick={onNo}><div className="mdl" onClick={e => e.stopPropagation()}>
    <div className="mdt">{title}</div><div className="mdtx">{text}</div>
    <div className="fx g8"><button className="btn bs" onClick={onNo}>Cancel</button>
      <button className={`btn ${danger ? "bd" : "bp"}`} onClick={onOk}>{okTxt}</button></div>
  </div></div>
);

const ICN={home:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>,
score:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
bets:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
players:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
courses:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
hist:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>};

const Nav = ({ pg, go, hr }) => (
  <div className="nav">
    <button className={`ni ${pg === "home" ? "on" : ""}`} onClick={() => go("home")}><span className="nii">{ICN.home}</span>Home</button>
    {hr && <button className={`ni ${pg === "score" ? "on" : ""}`} onClick={() => go("score")}><span className="nii">{ICN.score}</span>Score</button>}
    {hr && <button className={`ni ${pg === "bets" ? "on" : ""}`} onClick={() => go("bets")}><span className="nii">{ICN.bets}</span>Bets</button>}
    <button className={`ni ${pg === "players" ? "on" : ""}`} onClick={() => go("players")}><span className="nii">{ICN.players}</span>Players</button>
    <button className={`ni ${pg === "courses" ? "on" : ""}`} onClick={() => go("courses")}><span className="nii">{ICN.courses}</span>Courses</button>
    <button className={`ni ${pg === "hist" ? "on" : ""}`} onClick={() => go("hist")}><span className="nii">{ICN.hist}</span>History</button>
  </div>
);

// -- Home --
const Home = ({ courses, players, selectedCourseId, setSelectedCourseId, onStart, round, go }) => {
  const [sel, setSel] = useState([]);
  const [tees, setTees] = useState({});
  
  const course = courses.find(c => c.id === selectedCourseId) || courses[0];

  const tog = id => {
    if (sel.includes(id)) setSel(sel.filter(s => s !== id));
    else if (sel.length < 4) { 
      setSel([...sel, id]); 
      if (!tees[id] && course) setTees({ ...tees, [id]: course.tees[0]?.name || "" }); 
    }
  };

  if (round) {
    const hc = Math.min(...round.players.map(p => p.scores.filter(s => s != null).length));
    return (
      <div className="pg"><div className="cd">
        <div className="ct">Round in Progress</div>
        <p style={{ fontSize: 12, color: T.dim, marginBottom: 4 }}>{round.course.name}</p>
        <p style={{ fontSize: 12, color: T.dim, marginBottom: 10 }}>{round.players.map(p => p.name).join(" | ")}</p>
        <div style={{ fontSize: 11, color: T.accB, marginBottom: 10 }}>{hc}/18 holes | {round.games.length} game{round.games.length !== 1 ? "s" : ""}</div>
        <button className="btn bp mb6" onClick={() => go("score")}>Continue Scoring {">"}</button>
        <button className="btn bs" onClick={() => go("bets")}>View Bets {">"}</button>
      </div></div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="pg">
        <div className="empty">
          <div className="empty-i">â›³</div>
          <div className="empty-t">No courses yet</div>
          <div style={{ fontSize: 12, color: T.dim, marginTop: 8 }}>Add a course in the Courses tab to get started</div>
          <button className="btn bp bsm mt10" onClick={() => go("courses")}>Go to Courses</button>
        </div>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="pg">
        <div className="empty">
          <div className="empty-i">ðŸ‘¥</div>
          <div className="empty-t">No players yet</div>
          <div style={{ fontSize: 12, color: T.dim, marginTop: 8 }}>Add players in the Players tab to start a round</div>
          <button className="btn bp bsm mt10" onClick={() => go("players")}>Go to Players</button>
        </div>
      </div>
    );
  }

  const rdy = course && course.tees.some(t => t.rating > 0 && t.slope > 0);

  return (
    <div className="pg">
      <div className="cd">
        <div className="ct">New Round</div>
        <div className="il mb6">Select Course</div>
        <select className="inp mb10" value={selectedCourseId || ""} onChange={e => { setSelectedCourseId(e.target.value); sv("selectedCourse", e.target.value); setSel([]); setTees({}); }}>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.city}</option>)}
        </select>
        {!rdy && <div style={{ background: T.gold + "22", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: T.gold, fontWeight: 600 }}>This course needs tee data (rating/slope).</p>
          <button className="btn bg mt8" style={{ color: T.gold, borderColor: T.gold + "44" }} onClick={() => go("courses")}>Edit Course {">"}</button>
        </div>}
        <div className="il mb6">Select 4 Players</div>
        {players.map(p => {
          const s = sel.includes(p.id), ci = sel.indexOf(p.id);
          return (
            <div key={p.id} onClick={() => tog(p.id)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 8px", borderRadius: 7, marginBottom: 3, cursor: "pointer",
              background: s ? PC[ci] + "12" : "transparent", border: `1px solid ${s ? PC[ci] + "44" : T.bdr}`
            }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: s ? PC[ci] : T.mut, color: T.bg }}>{s ? ci + 1 : ""}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: T.dim }}>Index: {p.index}</div>
              </div>
              {s && course && <select className="inp ism" style={{ width: 80 }} value={tees[p.id] || course.tees[0]?.name} onChange={e => { e.stopPropagation(); setTees({ ...tees, [p.id]: e.target.value }); }}>
                {course.tees.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>}
            </div>
          );
        })}
      </div>
      {sel.length === 4 && rdy && course && <button className="btn bp" style={{ fontSize: 15, padding: 14 }} onClick={() => {
        const rp = sel.map((id, i) => {
          const p = players.find(x => x.id === id);
          const tn = tees[id] || course.tees[0]?.name;
          const tee = course.tees.find(t => t.name === tn) || course.tees[0];
          const tp = tee.pars.reduce((a, b) => a + b, 0);
          const ch = calcCH(p.index, tee.slope, tee.rating, tp);
          return { ...p, tee: tn, teeData: tee, courseHandicap: ch, strokeHoles: getStrokes(ch, tee.handicaps), scores: Array(18).fill(null), colorIdx: i };
        });
        onStart(rp, course);
      }}>Set Up Games {">"}</button>}
      {sel.length > 0 && sel.length < 4 && <p style={{ fontSize: 11, color: T.dim, textAlign: "center", marginTop: 6 }}>Select {4 - sel.length} more player{4 - sel.length !== 1 ? "s" : ""}</p>}
    </div>
  );
};

// -- Players Management --
const Players = ({ players, setPlayers }) => {
  const [sa, setSa] = useState(false);
  const [nm, setNm] = useState("");
  const [ix, setIx] = useState("");
  const [edit, setEdit] = useState(null);

  const add = () => {
    if (!nm.trim()) return;
    const up = [...players, { id: Date.now().toString(), name: nm.trim(), index: parseFloat(ix) || 0 }];
    setPlayers(up); sv("players", up); setNm(""); setIx(""); setSa(false);
  };

  const rm = id => { const up = players.filter(p => p.id !== id); setPlayers(up); sv("players", up); };

  const saveEdit = () => {
    if (!edit || !edit.name.trim()) return;
    const up = players.map(p => p.id === edit.id ? { ...p, name: edit.name.trim(), index: parseFloat(edit.index) || 0 } : p);
    setPlayers(up); sv("players", up); setEdit(null);
  };

  return (
    <div className="pg">
      <div className="fxb mb10">
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: T.accB }}>Players</span>
        <button className="btn bp bsm" onClick={() => setSa(true)}>+ Add</button>
      </div>

      {sa && <div className="cd">
        <div className="ct">New Player</div>
        <div className="mb8"><div className="il">Name</div>
          <input className="inp" placeholder="Player name" value={nm} onChange={e => setNm(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        </div>
        <div className="mb10"><div className="il">Handicap Index</div>
          <input className="inp" type="number" step="0.1" placeholder="12.5" value={ix} onChange={e => setIx(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        </div>
        <div className="fx g6">
          <button className="btn bp" onClick={add}>Add Player</button>
          <button className="btn bs" onClick={() => { setSa(false); setNm(""); setIx(""); }}>Cancel</button>
        </div>
      </div>}

      {players.length === 0 && !sa && (
        <div className="empty">
          <div className="empty-i">ðŸ‘¥</div>
          <div className="empty-t">No players yet</div>
          <div style={{ fontSize: 12, color: T.dim, marginTop: 8 }}>Add players to start tracking rounds</div>
        </div>
      )}

      {players.map(p => (
        <div key={p.id} className="prow">
          <div style={{ flex: 1 }}>
            <div className="prow-n">{p.name}</div>
            <div className="prow-i">Index: {p.index}</div>
          </div>
          <button className="bg" onClick={() => setEdit({ ...p })}>Edit</button>
          <button className="bg" style={{ color: T.red, borderColor: T.red + "33" }} onClick={() => rm(p.id)}>Delete</button>
        </div>
      ))}

      {edit && <div className="mbg" onClick={() => setEdit(null)}>
        <div className="mdl" onClick={e => e.stopPropagation()}>
          <div className="mdt">Edit Player</div>
          <div className="mb8"><div className="il">Name</div>
            <input className="inp" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />
          </div>
          <div className="mb10"><div className="il">Handicap Index</div>
            <input className="inp" type="number" step="0.1" value={edit.index} onChange={e => setEdit({ ...edit, index: e.target.value })} />
          </div>
          <div className="fx g8">
            <button className="btn bs" onClick={() => setEdit(null)}>Cancel</button>
            <button className="btn bp" onClick={saveEdit}>Save</button>
          </div>
        </div>
      </div>}
    </div>
  );
};

// -- Courses Management --
const Courses = ({ courses, setCourses, selectedCourseId, setSelectedCourseId }) => {
  const [edit, setEdit] = useState(null);
  const [sa, setSa] = useState(false);

  const addCourse = () => {
    const newC = {
      id: Date.now().toString(),
      name: "New Course",
      city: "City, State",
      tees: [{ name: "White", rating: 0, slope: 0, pars: Array(18).fill(4), handicaps: Array.from({ length: 18 }, (_, i) => i + 1) }]
    };
    const up = [...courses, newC];
    setCourses(up); sv("courses", up);
    setEdit(newC.id);
    setSa(false);
  };

  const deleteCourse = id => {
    const up = courses.filter(c => c.id !== id);
    setCourses(up); sv("courses", up);
    if (selectedCourseId === id) { setSelectedCourseId(up[0]?.id || null); sv("selectedCourse", up[0]?.id || null); }
  };

  return (
    <div className="pg">
      <div className="fxb mb10">
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: T.accB }}>Courses</span>
        <button className="btn bp bsm" onClick={addCourse}>+ Add Course</button>
      </div>

      {courses.length === 0 && (
        <div className="empty">
          <div className="empty-i">â›³</div>
          <div className="empty-t">No courses yet</div>
          <div style={{ fontSize: 12, color: T.dim, marginTop: 8 }}>Add a course to start playing rounds</div>
        </div>
      )}

      {courses.map(c => (
        <div key={c.id} className="prow">
          <div style={{ flex: 1 }}>
            <div className="prow-n">{c.name}</div>
            <div className="prow-i">{c.city} Â· {c.tees.length} tee{c.tees.length !== 1 ? "s" : ""}</div>
          </div>
          <button className="bg" onClick={() => setEdit(c.id)}>Edit</button>
          <button className="bg" style={{ color: T.red, borderColor: T.red + "33" }} onClick={() => deleteCourse(c.id)}>Delete</button>
        </div>
      ))}

      {edit && <CourseEditor courseId={edit} courses={courses} setCourses={setCourses} onClose={() => setEdit(null)} />}
    </div>
  );
};

// -- Course Editor --
const CourseEditor = ({ courseId, courses, setCourses, onClose }) => {
  const c = courses.find(x => x.id === courseId);
  const [name, setName] = useState(c.name);
  const [city, setCity] = useState(c.city);
  const [tees, setTees] = useState(c.tees);
  const [at, setAt] = useState(0);

  const save = () => {
    const up = courses.map(x => x.id === courseId ? { ...x, name, city, tees } : x);
    setCourses(up); sv("courses", up); onClose();
  };

  const ut = (f, v) => { const u = [...tees]; u[at] = { ...u[at], [f]: v }; setTees(u); };
  const uh = (f, hi, v) => { const u = [...tees]; const a = [...u[at][f]]; a[hi] = parseInt(v) || 0; u[at] = { ...u[at], [f]: a }; setTees(u); };

  const addTee = () => {
    const newT = { name: "New Tee", rating: 0, slope: 0, pars: [...tees[0].pars], handicaps: [...tees[0].handicaps] };
    setTees([...tees, newT]); setAt(tees.length);
  };

  const deleteTee = () => {
    if (tees.length === 1) return;
    const u = tees.filter((_, i) => i !== at);
    setTees(u); setAt(Math.max(0, at - 1));
  };

  const tee = tees[at];

  return (
    <div className="mbg" onClick={onClose}>
      <div className="mdl" onClick={e => e.stopPropagation()} style={{ maxWidth: "440px", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="mdt">Edit Course</div>
        
        <div className="mb8"><div className="il">Course Name</div>
          <input className="inp" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="mb10"><div className="il">City, State</div>
          <input className="inp" value={city} onChange={e => setCity(e.target.value)} />
        </div>

        <div className="dvd" />
        
        <div className="fxb mb6">
          <div className="il" style={{ marginBottom: 0 }}>Tees</div>
          <button className="bg" onClick={addTee}>+ Add Tee</button>
        </div>

        <div className="tabs">{tees.map((t, i) => <button key={i} className={`tab ${at === i ? "on" : ""}`} onClick={() => setAt(i)}>{t.name}</button>)}</div>

        <div className="mb8"><div className="il">Tee Name</div>
          <input className="inp" value={tee.name} onChange={e => ut("name", e.target.value)} />
        </div>

        <div className="g2 mb10">
          <div><div className="il">Rating</div>
            <input className="inp" type="number" step="0.1" value={tee.rating || ""} placeholder="72.3" onChange={e => ut("rating", parseFloat(e.target.value) || 0)} />
          </div>
          <div><div className="il">Slope</div>
            <input className="inp" type="number" value={tee.slope || ""} placeholder="135" onChange={e => ut("slope", parseInt(e.target.value) || 0)} />
          </div>
        </div>

        <div style={{ fontSize: 11, color: T.dim, marginBottom: 10 }}>Par: {tee.pars.reduce((a, b) => a + b, 0)}</div>

        {[{ l: "Front 9", s: 0 }, { l: "Back 9", s: 9 }].map(nine => (
          <div key={nine.l} style={{ marginBottom: 12 }}>
            <div className="il mb6">{nine.l}</div>
            <div className="sw"><table className="sct"><thead><tr>
              <th style={{ minWidth: 36, textAlign: "left", paddingLeft: 4 }}></th>
              {Array.from({ length: 9 }, (_, i) => <th key={i} className="hn">{nine.s + i + 1}</th>)}
              <th className="tc">Tot</th>
            </tr></thead><tbody>
              <tr><td style={{ textAlign: "left", paddingLeft: 4, fontSize: 9, color: T.dim }}>Par</td>
                {Array.from({ length: 9 }, (_, i) => <td key={i}><input className="si" type="number" value={tee.pars[nine.s + i] || ""} onChange={e => uh("pars", nine.s + i, e.target.value)} /></td>)}
                <td className="tc" style={{ fontSize: 10 }}>{tee.pars.slice(nine.s, nine.s + 9).reduce((a, b) => a + b, 0)}</td>
              </tr>
              <tr><td style={{ textAlign: "left", paddingLeft: 4, fontSize: 9, color: T.dim }}>HCP</td>
                {Array.from({ length: 9 }, (_, i) => <td key={i}><input className="si" type="number" value={tee.handicaps[nine.s + i] || ""} onChange={e => uh("handicaps", nine.s + i, e.target.value)} /></td>)}
                <td />
              </tr>
            </tbody></table></div>
          </div>
        ))}

        {tees.length > 1 && <button className="btn bd mb10" onClick={deleteTee}>Delete This Tee</button>}

        <div className="fx g8">
          <button className="btn bs" onClick={onClose}>Cancel</button>
          <button className="btn bp" onClick={save}>Save Course</button>
        </div>
      </div>
    </div>
  );
};

// -- Game Setup --
const Setup = ({ rp, course, onConfirm }) => {
  const [games, setGames] = useState([]);
  const [sa, setSa] = useState(true);
  const n = rp.map(p => p.name.split(" ")[0]);

  const add = t => {
    const g = { type: t, id: Date.now() };
    if (t === GT.STROKE) Object.assign(g, { net: true, wagerPerPlayer: 10 });
    else if (t === GT.MATCH) Object.assign(g, { team1: [0, 1], team2: [2, 3], wagerFront: 5, wagerBack: 5, wagerOverall: 10 });
    else if (t === GT.SKINS) Object.assign(g, { net: true, carryOver: true, potPerPlayer: 20 });
    else Object.assign(g, { mode: "match", wagerPerSegment: 5, pairs: sixPairs() }); // Store random pairings
    setGames([...games, g]); setSa(false);
  };
  const u = (id, up) => setGames(games.map(g => g.id === id ? { ...g, ...up } : g));

  return (
    <div className="pg">
      <div className="cd">
        <div className="ct">Foursome</div>
        <div style={{ fontSize: 11, color: T.dim, marginBottom: 8 }}>{course.name}</div>
        {rp.map((p, i) => (
          <div key={p.id} className="fxb" style={{ padding: "5px 0" }}>
            <div className="fx g6"><span className={`pc${i}`} style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</span><span className="tag tg">{p.tee}</span></div>
            <span style={{ fontSize: 11, color: T.dim }}>Idx {p.index} {">"} CH {p.courseHandicap}</span>
          </div>
        ))}
        <div className="dvd" />
        <div className="il mb6">Stroke Allocation</div>
        <div className="sw"><table className="sct"><thead><tr><th style={{ minWidth: 44, textAlign: "left", paddingLeft: 4 }}>Hole</th>
          {Array.from({ length: 18 }, (_, i) => <th key={i} className="hn">{i + 1}</th>)}</tr></thead><tbody>
          <tr style={{ color: T.mut, fontSize: 8 }}><td style={{ textAlign: "left", paddingLeft: 4, fontSize: 8 }}>HCP</td>{rp[0].teeData.handicaps.map((h, i) => <td key={i}>{h}</td>)}</tr>
          {rp.map((p, pi) => <tr key={pi}><td style={{ textAlign: "left", paddingLeft: 4 }}><span className={`pc${pi}`} style={{ fontWeight: 600, fontSize: 9 }}>{n[pi]}</span></td>
            {p.strokeHoles.map((s, i) => <td key={i} style={{ color: s > 0 ? T.gold : T.mut, fontWeight: s > 0 ? 700 : 400, fontSize: 10 }}>{s > 0 ? (s > 1 ? s : "*") : "|"}</td>)}</tr>)}
        </tbody></table></div>
      </div>

      <div className="fxb mb10">
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 600, color: T.accB }}>Games</span>
        <button className="btn bp bsm" onClick={() => setSa(true)}>+ Add</button>
      </div>

      {sa && <div className="cd"><div className="g2">
        <button className="btn bs" onClick={() => add(GT.STROKE)}>Stroke</button>
        <button className="btn bs" onClick={() => add(GT.MATCH)}>Match</button>
        <button className="btn bs" onClick={() => add(GT.SKINS)}>Skins</button>
        <button className="btn bs" onClick={() => add(GT.SIXES)}>6-6-6</button>
      </div></div>}

      {games.map(g => (
        <div key={g.id} className="cd">
          <div className="fxb mb6">
            <span className="ct" style={{ marginBottom: 0 }}>{g.type === GT.STROKE ? "Stroke" : g.type === GT.MATCH ? "Match" : g.type === GT.SKINS ? "Skins" : "6-6-6"}</span>
            <button className="bg" style={{ color: T.red, borderColor: T.red + "33", padding: "3px 7px", fontSize: 10 }} onClick={() => setGames(games.filter(x => x.id !== g.id))}>Remove</button>
          </div>
          {g.type === GT.STROKE && <>
            <div className="il mb6">Format</div>
            <div className="fx g6 mb10">
              <button className={`chip ${!g.team1 ? "sel" : ""}`} onClick={() => { const { team1, team2, wagerFront, wagerBack, wagerOverall, ...rest } = g; u(g.id, { ...rest, wagerPerPlayer: 10 }); }}>Individual</button>
              <button className={`chip ${g.team1 ? "sel" : ""}`} onClick={() => u(g.id, { team1: [0, 1], team2: [2, 3], wagerFront: 5, wagerBack: 5, wagerOverall: 10 })}>2v2 Teams</button>
            </div>
            <Tog label="Net" v={g.net} onChange={v => u(g.id, { net: v })} />
            {!g.team1 ? (
              <div><div className="il">$/player</div><input className="inp" type="number" value={g.wagerPerPlayer} onChange={e => u(g.id, { wagerPerPlayer: parseFloat(e.target.value) || 0 })} /></div>
            ) : (
              <>
                <div className="fx g6 mb8" style={{ justifyContent: "center" }}>
                  <div style={{ flex: 1, textAlign: "center", padding: 6, borderRadius: 7, background: T.accD + "22", fontSize: 12, fontWeight: 600 }}><span className={`pc${g.team1[0]}`}>{n[g.team1[0]]}</span> & <span className={`pc${g.team1[1]}`}>{n[g.team1[1]]}</span></div>
                  <span style={{ color: T.dim, fontWeight: 700, fontSize: 11 }}>vs</span>
                  <div style={{ flex: 1, textAlign: "center", padding: 6, borderRadius: 7, background: T.red + "15", fontSize: 12, fontWeight: 600 }}><span className={`pc${g.team2[0]}`}>{n[g.team2[0]]}</span> & <span className={`pc${g.team2[1]}`}>{n[g.team2[1]]}</span></div>
                </div>
                <button className="btn bg mb10" style={{ width: "100%", fontSize: 10 }} onClick={() => {
                  const c = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]];
                  const cur = c.findIndex(x => x[0] === g.team1[0] && x[1] === g.team1[1]);
                  const nx = c[(cur + 1) % 3];
                  u(g.id, { team1: [nx[0], nx[1]], team2: [nx[2], nx[3]] });
                }}>Swap Teams</button>
                <div className="g3">{[["Front", "wagerFront"], ["Back", "wagerBack"], ["Overall", "wagerOverall"]].map(([l, k]) =>
                  <div key={k}><div className="il">{l} $</div><input className="inp ism" style={{ width: "100%" }} type="number" value={g[k]} onChange={e => u(g.id, { [k]: parseFloat(e.target.value) || 0 })} /></div>
                )}</div>
              </>
            )}
          </>}
          {g.type === GT.MATCH && <>
            <div className="fx g6 mb8" style={{ justifyContent: "center" }}>
              <div style={{ flex: 1, textAlign: "center", padding: 6, borderRadius: 7, background: T.accD + "22", fontSize: 12, fontWeight: 600 }}><span className={`pc${g.team1[0]}`}>{n[g.team1[0]]}</span> & <span className={`pc${g.team1[1]}`}>{n[g.team1[1]]}</span></div>
              <span style={{ color: T.dim, fontWeight: 700, fontSize: 11 }}>vs</span>
              <div style={{ flex: 1, textAlign: "center", padding: 6, borderRadius: 7, background: T.red + "15", fontSize: 12, fontWeight: 600 }}><span className={`pc${g.team2[0]}`}>{n[g.team2[0]]}</span> & <span className={`pc${g.team2[1]}`}>{n[g.team2[1]]}</span></div>
            </div>
            <button className="btn bg mb10" style={{ width: "100%", fontSize: 10 }} onClick={() => {
              const c = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]];
              const cur = c.findIndex(x => x[0] === g.team1[0] && x[1] === g.team1[1]);
              const nx = c[(cur + 1) % 3];
              u(g.id, { team1: [nx[0], nx[1]], team2: [nx[2], nx[3]] });
            }}>Swap Teams</button>
            <div className="g3">{[["Front", "wagerFront"], ["Back", "wagerBack"], ["Overall", "wagerOverall"]].map(([l, k]) =>
              <div key={k}><div className="il">{l} $</div><input className="inp ism" style={{ width: "100%" }} type="number" value={g[k]} onChange={e => u(g.id, { [k]: parseFloat(e.target.value) || 0 })} /></div>
            )}</div>
          </>}
          {g.type === GT.SKINS && <>
            <Tog label="Net" v={g.net} onChange={v => u(g.id, { net: v })} />
            <Tog label="Carry-over" v={g.carryOver} onChange={v => u(g.id, { carryOver: v })} />
            <div><div className="il">Pot $/player</div><input className="inp" type="number" value={g.potPerPlayer} onChange={e => u(g.id, { potPerPlayer: parseFloat(e.target.value) || 0 })} /></div>
          </>}
          {g.type === GT.SIXES && <>
            <div className="il mb6">Format</div>
            <div className="fx g6 mb10">
              <button className={`chip ${g.mode === "match" ? "sel" : ""}`} onClick={() => u(g.id, { mode: "match" })}>Match</button>
              <button className={`chip ${g.mode === "stroke" ? "sel" : ""}`} onClick={() => u(g.id, { mode: "stroke" })}>Stroke</button>
            </div>
            <div><div className="il">$/segment/person</div><input className="inp" type="number" value={g.wagerPerSegment} onChange={e => u(g.id, { wagerPerSegment: parseFloat(e.target.value) || 0 })} /></div>
            <div className="dvd" />
            <div className="fxb mb6">
              <div className="il" style={{ marginBottom: 0 }}>Pairings</div>
              <button className="bg" onClick={() => u(g.id, { pairs: sixPairs() })}>Randomize</button>
            </div>
            <div style={{ fontSize: 10, color: T.dim }}>{(g.pairs || []).map((p, i) => <div key={i}>{p.l}: {n[p.t1[0]]}&{n[p.t1[1]]} vs {n[p.t2[0]]}&{n[p.t2[1]]}</div>)}</div>
          </>}
        </div>
      ))}
      {games.length > 0 && <button className="btn bp" style={{ fontSize: 15, padding: 14 }} onClick={() => onConfirm(games)}>Start Round {">"}</button>}
    </div>
  );
};

// -- Scoring (unchanged from phase 2, with Par button fix) --
const Scoring = ({ round, updateScore }) => {
  const [hole, setHole] = useState(() => { for (let h = 0; h < 18; h++) { if (!round.players.every(p => p.scores[h] != null)) return h; } return 17; });
  const [view, setView] = useState("hole");
  const pl = round.players, n = pl.map(p => p.name.split(" ")[0]);
  const { balances, results } = useMemo(() => calcAll(round.games, pl), [round]);

  useEffect(() => {
    if (pl.every(p => p.scores[hole] != null) && hole < 17) {
      const isFurthestHole = !pl.some(p => p.scores.slice(hole + 1).some(s => s != null));
      if (isFurthestHole) {
        const t = setTimeout(() => setHole(h => Math.min(17, h + 1)), 500);
        return () => clearTimeout(t);
      }
    }
  }, [pl.map(p => p.scores[hole]).join(",")]);

  const HV = () => {
    const lb = pl.map((p, i) => {
      const played = p.scores.filter(s => s != null).length;
      const gross = p.scores.filter(s => s != null).reduce((a, b) => a + b, 0);
      const parPlayed = p.teeData.pars.filter((_, hi) => p.scores[hi] != null).reduce((a, b) => a + b, 0);
      const toPar = gross - parPlayed;
      return { i, gross, toPar, played, name: n[i] };
    }).sort((a, b) => a.gross - b.gross);

    return (
      <div>
        <div className="tk"><div className="tkt">Leaderboard</div>
          {lb.map((x, ri) => (
            <div key={x.i} className="tkr">
              <div className="fx g6"><span style={{ fontSize: 10, color: T.mut, width: 14 }}>{ri + 1}.</span><span className={`pc${x.i}`} style={{ fontWeight: 600 }}>{x.name}</span></div>
              <div className="fx g8">
                <span style={{ fontSize: 11, fontWeight: 700 }}>{x.gross || "--"}</span>
                <span style={{ fontSize: 10, color: x.toPar < 0 ? T.accB : x.toPar > 0 ? T.red : T.dim, fontWeight: 600 }}>{x.played > 0 ? (x.toPar > 0 ? "+" : "") + x.toPar : "--"}</span>
                <span style={{ fontSize: 10, color: balances[x.i] < -0.01 ? T.accB : balances[x.i] > 0.01 ? T.red : T.dim, fontWeight: 600, minWidth: 44, textAlign: "right" }}>{fmt$(-balances[x.i])}</span>
              </div>
            </div>
          ))}
        </div>

        {results.length > 0 && <div className="tk"><div className="tkt">Live Bets</div>
          {results.map((r, ri) => (
            <div key={ri} style={{ marginBottom: ri < results.length - 1 ? 6 : 0 }}>
              <div className="fxb">
                <span style={{ fontWeight: 600, color: T.txt, fontSize: 10 }}>{r.title}</span>
                {r.status && <span style={{ fontSize: 9, color: T.accB, fontWeight: 600 }}>{r.status}</span>}
              </div>
              {r.holeResults && (() => {
                const sc = [0, 0, 0, 0]; r.holeResults.forEach(h => { if (h.w != null) sc[h.w] += h.v; });
                const carry = r.holeResults.filter(h => h.r === "C").length;
                return <div className="fx g6" style={{ marginTop: 2 }}>
                  {pl.map((_, i) => sc[i] > 0 ? <span key={i} className={`pc${i}`} style={{ fontSize: 9, fontWeight: 600 }}>{n[i]}:{sc[i]}</span> : null)}
                  {carry > 0 && <span style={{ fontSize: 9, color: T.gold }}>+{carry}carry</span>}
                </div>;
              })()}
            </div>
          ))}
        </div>}

        <div className="fxb mb12">
          <button className="bg" disabled={hole === 0} onClick={() => setHole(hole - 1)}>{"<"} Prev</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: T.accB }}>Hole {hole + 1}</div>
            <div style={{ fontSize: 10, color: T.dim }}>Par {pl[0].teeData.pars[hole]}</div>
          </div>
          <button className="bg" disabled={hole === 17} onClick={() => setHole(hole + 1)}>Next {">"}</button>
        </div>

        {pl.map((p, pi) => {
          const par = p.teeData.pars[hole], str = p.strokeHoles[hole], sc = p.scores[hole];
          return (
            <div key={p.id} className={`sec pb${pi}`}>
              <div className="fxb mb6">
                <div className="fx g6">
                  <span className={`pc${pi}`} style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</span>
                  {str > 0 && <span className="tag ty">{str > 1 ? str + "x" : "1 str"}</span>}
                </div>
                <span style={{ fontSize: 10, color: T.dim }}>Par {par} | HCP {p.teeData.handicaps[hole]}</span>
              </div>
              <div className="fx g6" style={{ justifyContent: "center" }}>
                <button className="seb" onClick={() => updateScore(pi, hole, Math.max(1, (sc || par) - 1))}>{"-"}</button>
                <div className={`sev ${sc != null ? scoreClass(sc, par) : ""}`}>{sc != null ? sc : "--"}</div>
                <button className="seb" onClick={() => updateScore(pi, hole, Math.min(15, (sc || par) + 1))}>+</button>
                <button className="seb" onClick={() => updateScore(pi, hole, par)} style={{ fontSize: 11, width: 48 }}>Par</button>
                <button className="secl" onClick={() => updateScore(pi, hole, null)} style={{ visibility: sc != null ? "visible" : "hidden" }}>{"x"}</button>
              </div>
              {sc != null && str > 0 && <div style={{ textAlign: "center", marginTop: 4, fontSize: 10, color: T.gold }}>Net: {sc - str}</div>}
            </div>
          );
        })}

        <div className="hs">{Array.from({ length: 18 }, (_, i) => {
          const done = pl.every(p => p.scores[i] != null);
          return <button key={i} onClick={() => setHole(i)} className={`hb ${i === hole ? "cur" : ""} ${done ? "done" : ""}`}>{i + 1}</button>;
        })}</div>
      </div>
    );
  };

  const CV = () => {
    const rn = (s, l) => (
      <div className="sw mb10"><table className="sct"><thead><tr>
        <th style={{ minWidth: 44, textAlign: "left", paddingLeft: 4 }}>{l}</th>
        {Array.from({ length: 9 }, (_, i) => <th key={i} className="hn">{s + i + 1}</th>)}
        <th className="tc">{s === 0 ? "OUT" : "IN"}</th>
        {s === 9 && <th className="tc">TOT</th>}
      </tr></thead><tbody>
        {pl.map((p, pi) => (
          <tr key={pi}><td style={{ textAlign: "left", paddingLeft: 4 }}><span className={`pc${pi}`} style={{ fontWeight: 600, fontSize: 9 }}>{n[pi]}</span></td>
            {Array.from({ length: 9 }, (_, i) => {
              const hi = s + i, sc = p.scores[hi], par = p.teeData.pars[hi], st = p.strokeHoles[hi];
              return <td key={i} className={`sc ${sc != null ? scoreClass(sc, par) : ""}`} onClick={() => { setHole(hi); setView("hole"); }} style={{ fontWeight: 600 }}>
                {st > 0 && <div className="sd" />}{st > 1 && <div className="sd2" />}{sc != null ? sc : "|"}</td>;
            })}
            <td className="tc">{p.scores.slice(s, s + 9).some(x => x != null) ? p.scores.slice(s, s + 9).filter(x => x != null).reduce((a, b) => a + b, 0) : "--"}</td>
            {s === 9 && <td className="tc" style={{ color: T.accB }}>{p.scores.some(x => x != null) ? p.scores.filter(x => x != null).reduce((a, b) => a + b, 0) : "--"}</td>}
          </tr>
        ))}
        <tr style={{ color: T.dim }}><td style={{ textAlign: "left", paddingLeft: 4, fontSize: 8 }}>PAR</td>
          {Array.from({ length: 9 }, (_, i) => <td key={i}>{pl[0].teeData.pars[s + i]}</td>)}
          <td className="tc">{pl[0].teeData.pars.slice(s, s + 9).reduce((a, b) => a + b, 0)}</td>
          {s === 9 && <td className="tc">{pl[0].teeData.pars.reduce((a, b) => a + b, 0)}</td>}
        </tr>
        <tr style={{ color: T.mut, fontSize: 8 }}><td style={{ textAlign: "left", paddingLeft: 4, fontSize: 8 }}>HCP</td>
          {Array.from({ length: 9 }, (_, i) => <td key={i}>{pl[0].teeData.handicaps[s + i]}</td>)}
          <td />{s === 9 && <td />}
        </tr>
      </tbody></table></div>
    );
    return <div>{rn(0, "FRONT")}{rn(9, "BACK")}</div>;
  };

  return (
    <div className="pg">
      <div className="tabs">
        <button className={`tab ${view === "hole" ? "on" : ""}`} onClick={() => setView("hole")}>By Hole</button>
        <button className={`tab ${view === "card" ? "on" : ""}`} onClick={() => setView("card")}>Card</button>
      </div>
      {view === "hole" ? <HV /> : <CV />}
    </div>
  );
};

// -- Bets (unchanged from phase 2) --
const Bets = ({ round }) => {
  const pl = round.players, n = pl.map(p => p.name.split(" ")[0]);
  const { results, settlements, balances } = useMemo(() => calcAll(round.games, pl), [round]);
  const [exp, setExp] = useState(null);
  
  // Find current hole for 6-6-6 active pairing display
  const currentHole = (() => { for (let h = 0; h < 18; h++) { if (!pl.every(p => p.scores[h] != null)) return h; } return 17; })();

  return (
    <div className="pg">
      <div className="cd"><div className="ct">Player P&L</div>
        {pl.map((_, i) => {
          const v = -balances[i];
          return <div key={i} className={`sr ${v > 0.01 ? "sp" : v < -0.01 ? "sn" : "su"}`}>
            <span className={`pc${i}`} style={{ fontWeight: 700 }}>{n[i]}</span>
            <span style={{ fontWeight: 700 }}>{fmt$(v)}</span>
          </div>;
        })}
      </div>
      
      {/* Show 6-6-6 active pairing */}
      {results.filter(r => r.title.includes("6-6-6") && r.segmentScores).map((r, ri) => {
        const activeSeg = r.segmentScores.find(seg => currentHole >= (seg.range === "1-6" ? 0 : seg.range === "7-12" ? 6 : 12) && currentHole <= (seg.range === "1-6" ? 5 : seg.range === "7-12" ? 11 : 17));
        if (!activeSeg) return null;
        return (
          <div key={ri} className="cd">
            <div className="ct">Active: {r.title}</div>
            <div style={{ fontSize: 11, color: T.dim, marginBottom: 8 }}>Holes {activeSeg.range}</div>
            <div className="fxb mb6">
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}><span className={`pc${activeSeg.t1[0]}`}>{n[activeSeg.t1[0]]}</span> & <span className={`pc${activeSeg.t1[1]}`}>{n[activeSeg.t1[1]]}</span></div>
                <div style={{ fontSize: 20, fontWeight: 700, color: activeSeg.winner === "t1" ? T.accB : T.txt, marginTop: 4 }}>{activeSeg.s1}</div>
              </div>
              <div style={{ fontSize: 10, color: T.dim, alignSelf: "center" }}>vs</div>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}><span className={`pc${activeSeg.t2[0]}`}>{n[activeSeg.t2[0]]}</span> & <span className={`pc${activeSeg.t2[1]}`}>{n[activeSeg.t2[1]]}</span></div>
                <div style={{ fontSize: 20, fontWeight: 700, color: activeSeg.winner === "t2" ? T.accB : T.txt, marginTop: 4 }}>{activeSeg.s2}</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: T.dim, textAlign: "center" }}>{activeSeg.played}/{activeSeg.holes} holes played</div>
          </div>
        );
      })}
      
      {settlements.length > 0 && <div className="cd"><div className="ct">Settlement</div>
        {settlements.map((s, i) => (
          <div key={i} className="sr sn">
            <span><span className={`pc${s.from}`} style={{ fontWeight: 600 }}>{n[s.from]}</span> pays <span className={`pc${s.to}`} style={{ fontWeight: 600 }}>{n[s.to]}</span></span>
            <span style={{ fontWeight: 700 }}>${s.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>}
      {results.map((r, ri) => (
        <div key={ri} className="cd" style={{ cursor: "pointer" }} onClick={() => setExp(exp === ri ? null : ri)}>
          <div className="fxb mb6"><span className="ct" style={{ marginBottom: 0 }}>{r.title}</span>{r.wager && <span className="tag ty">{r.wager}</span>}</div>
          {r.status && <div style={{ fontSize: 12, fontWeight: 700, color: T.accB, marginBottom: 6 }}>{r.status}</div>}
          {exp === ri && <div style={{ marginTop: 6 }}>
            {r.details?.map((d, j) => <div key={j} style={{ fontSize: 11, color: T.dim, marginBottom: 3 }}>{d}</div>)}
            {r.holeResults && <div className="mt8">
              <div className="il mb6">Skins by Hole</div>
              {[{ l: "Front 9", s: 0, e: 9 }, { l: "Back 9", s: 9, e: 18 }].map(nine => (
                <div key={nine.l} className="sw mb6"><table className="sct"><thead><tr>
                  <th style={{ minWidth: 36, textAlign: "left", paddingLeft: 4, fontSize: 8 }}>{nine.l}</th>
                  {Array.from({ length: 9 }, (_, i) => <th key={i} className="hn">{nine.s + i + 1}</th>)}
                </tr></thead><tbody>
                  {pl.map((p, pi) => (
                    <tr key={pi}><td style={{ textAlign: "left", paddingLeft: 4 }}><span className={`pc${pi}`} style={{ fontWeight: 600, fontSize: 9 }}>{n[pi]}</span></td>
                      {Array.from({ length: 9 }, (_, i) => {
                        const hi = nine.s + i, sc = p.scores[hi], hri = r.holeResults[hi];
                        const isW = hri && hri.w === pi;
                        return <td key={i} style={{ fontSize: 10, fontWeight: isW ? 800 : 500, color: isW ? PC[pi] : sc != null ? T.txt : T.mut, background: isW ? PC[pi] + "15" : "transparent" }}>{sc != null ? sc : "|"}</td>;
                      })}
                    </tr>
                  ))}
                  <tr><td style={{ textAlign: "left", paddingLeft: 4, fontSize: 8, color: T.mut }}>Skin</td>
                    {Array.from({ length: 9 }, (_, i) => {
                      const hri = r.holeResults[nine.s + i];
                      return <td key={i} style={{ fontSize: 8, fontWeight: 700, color: hri && hri.w != null ? PC[hri.w] : T.mut }}>
                        {hri ? hri.w != null ? (hri.v > 1 ? hri.v + "W" : "W") : hri.r === "--" ? "|" : hri.r : "|"}
                      </td>;
                    })}
                  </tr>
                </tbody></table></div>
              ))}
              <div className="fx fw g6" style={{ justifyContent: "center" }}>
                {pl.map((_, i) => {
                  const cnt = r.holeResults.filter(h => h.w === i).reduce((a, h) => a + h.v, 0);
                  return cnt > 0 ? <span key={i} className={`pc${i}`} style={{ fontSize: 10, fontWeight: 700 }}>{n[i]}: {cnt} skin{cnt !== 1 ? "s" : ""}</span> : null;
                })}
              </div>
            </div>}
          </div>}
          <div style={{ textAlign: "center", fontSize: 9, color: T.mut, marginTop: 4 }}>{exp === ri ? "Hide" : "Details"}</div>
        </div>
      ))}
    </div>
  );
};

// -- History --
const Hist = ({ rounds, onLoad }) => {
  const [det, setDet] = useState(null);

  if (det) {
    const r = det, n = r.players.map(p => p.name.split(" ")[0]);
    const { results, settlements, balances } = calcAll(r.games, r.players);
    return (
      <div className="pg">
        <button className="btn bg mb10" onClick={() => setDet(null)}>{"<"} Back</button>
        <div className="cd">
          <div className="ct">{r.course.name}</div>
          <div style={{ fontSize: 11, color: T.dim, marginBottom: 8 }}>{r.date}</div>
          {r.players.map((p, i) => {
            const gr = p.scores.filter(s => s != null).reduce((a, b) => a + b, 0);
            return <div key={i} className="fxb" style={{ padding: "4px 0" }}>
              <div className="fx g6"><span className={`pc${i}`} style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</span><span className="tag tg">{p.tee}</span></div>
              <div className="fx g8"><span style={{ fontSize: 22, fontWeight: 700 }}>{gr}</span><span style={{ fontSize: 10, color: T.dim }}>CH {p.courseHandicap}</span></div>
            </div>;
          })}
        </div>
        <div className="cd"><div className="ct">Final P&L</div>
          {r.players.map((_, i) => {
            const v = -balances[i];
            return <div key={i} className={`sr ${v > 0.01 ? "sp" : v < -0.01 ? "sn" : "su"}`}>
              <span className={`pc${i}`} style={{ fontWeight: 700 }}>{n[i]}</span><span style={{ fontWeight: 700 }}>{fmt$(v)}</span></div>;
          })}
        </div>
        {settlements.length > 0 && <div className="cd"><div className="ct">Settlement</div>
          {settlements.map((s, i) => <div key={i} className="sr sn">
            <span>{n[s.from]} {">"} {n[s.to]}</span><span>${s.amount.toFixed(2)}</span>
          </div>)}
        </div>}
        {results.map((r, i) => <div key={i} className="cd"><div className="ct">{r.title}</div>
          {r.details?.map((d, j) => <div key={j} style={{ fontSize: 11, color: T.dim, marginBottom: 2 }}>{d}</div>)}
        </div>)}
        <button className="btn bs mt10" onClick={() => onLoad(det)}>Reopen Round</button>
      </div>
    );
  }

  if (!rounds.length) return (
    <div className="pg">
      <div className="empty">
        <div className="empty-i">ðŸ“Š</div>
        <div className="empty-t">No rounds yet</div>
        <div style={{ fontSize: 12, color: T.dim, marginTop: 8 }}>Completed rounds will appear here</div>
      </div>
    </div>
  );

  return (
    <div className="pg">
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: T.accB, marginBottom: 12 }}>History</div>
      {[...rounds].reverse().map((r, i) => {
        const { balances } = calcAll(r.games, r.players), n = r.players.map(p => p.name.split(" ")[0]);
        return <div key={i} className="cd" style={{ cursor: "pointer" }} onClick={() => setDet(r)}>
          <div className="fxb mb6"><div><div style={{ fontWeight: 600, fontSize: 13 }}>{r.course.name}</div><div style={{ fontSize: 10, color: T.dim }}>{r.date}</div></div></div>
          <div className="fx fw g6">{r.players.map((p, pi) => {
            const gr = p.scores.filter(s => s != null).reduce((a, b) => a + b, 0), v = -balances[pi];
            return <div key={pi} className="fx g6" style={{ fontSize: 11 }}>
              <span className={`pc${pi}`} style={{ fontWeight: 600 }}>{n[pi]}:{gr}</span>
              <span style={{ color: v > 0.01 ? T.accB : v < -0.01 ? T.red : T.dim, fontWeight: 600, fontSize: 10 }}>({fmt$(v)})</span>
            </div>;
          })}</div>
        </div>;
      })}
    </div>
  );
};

// -- App --
export default function App() {
  const [pg, setPg] = useState("home");
  const [players, setPlayers] = useState(() => ld("players", []));
  const [courses, setCourses] = useState(() => ld("courses", []));
  const [selectedCourseId, setSelectedCourseId] = useState(() => ld("selectedCourse", courses[0]?.id || null));
  const [round, setRound] = useState(() => ld("currentRound", null));
  const [rounds, setRounds] = useState(() => ld("rounds", []));
  const [setup, setSetup] = useState(null);
  const [setupCourse, setSetupCourse] = useState(null);
  const [modal, setModal] = useState(null);

  const go = p => setPg(p);
  const us = (pi, hi, v) => {
    setRound(prev => {
      const u = { ...prev, players: prev.players.map((p, i) => { if (i !== pi) return p; const s = [...p.scores]; s[hi] = v; return { ...p, scores: s }; }) };
      sv("currentRound", u);
      return u;
    });
  };

  const finish = () => {
    const hc = round.players.map(p => p.scores.filter(s => s != null).length);
    const minHoles = Math.min(...hc);
    const { balances } = calcAll(round.games, round.players);
    const n = round.players.map(p => p.name.split(" ")[0]);
    const summary = minHoles + "/18 holes | " + round.games.length + " game" + (round.games.length !== 1 ? "s" : "");
    const winners = balances.map((b, i) => ({ n: n[i], v: -b })).filter(x => x.v > 0.005).sort((a, b) => b.v - a.v);
    const winText = winners.length > 0 ? "\n\nTop: " + winners.slice(0, 2).map(w => w.n + " " + fmt$(w.v)).join(", ") : "";
    setModal({
      title: "Finish Round?",
      text: summary + winText + "\n\nSave to history?",
      onOk: () => {
        const up = [...rounds, round]; setRounds(up); sv("rounds", up);
        setRound(null); sv("currentRound", null); setModal(null); go("home");
      },
      onNo: () => setModal(null)
    });
  };

  const abandon = () => setModal({
    title: "Abandon Round?",
    text: "All scores and game data will be permanently lost. This cannot be undone.",
    okTxt: "Delete Round", danger: true,
    onOk: () => { setRound(null); sv("currentRound", null); setModal(null); go("home"); },
    onNo: () => setModal(null)
  });

  const titles = { home: "Golf Tracker", score: "Scoring", bets: "Bets & Settlement", players: "Players", courses: "Courses", hist: "History", setup: "Game Setup" };

  return (
    <><style>{CSS}</style><div className="app">
      <div className="hdr">
        {["setup", "score", "bets"].includes(pg) && <button className="hdr-bk" onClick={() => { if (pg === "setup") { setSetup(null); setSetupCourse(null); go("home"); } else go("home"); }}>{"<"}</button>}
        <div><div className="hdr-t">{titles[pg]}</div>{pg === "score" && round && <div className="hdr-s">{round.course.name}</div>}</div>
        {pg === "score" && round && <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="btn bp bsm" onClick={finish}>Finish</button>
          <button className="bg" style={{ color: T.red, borderColor: T.red + "33" }} onClick={abandon}>{"x"}</button>
        </div>}
      </div>
      {pg === "home" && <Home courses={courses} players={players} selectedCourseId={selectedCourseId} setSelectedCourseId={setSelectedCourseId} onStart={(rp, course) => { setSetup(rp); setSetupCourse(course); go("setup"); }} round={round} go={go} />}
      {pg === "players" && <Players players={players} setPlayers={setPlayers} />}
      {pg === "courses" && <Courses courses={courses} setCourses={setCourses} selectedCourseId={selectedCourseId} setSelectedCourseId={setSelectedCourseId} />}
      {pg === "setup" && setup && setupCourse && <Setup rp={setup} course={setupCourse} onConfirm={games => {
        const r = {
          id: Date.now().toString(),
          date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
          course: { name: setupCourse.name, city: setupCourse.city },
          players: setup, games
        };
        setRound(r); sv("currentRound", r); setSetup(null); setSetupCourse(null); go("score");
      }} />}
      {pg === "score" && round && <Scoring round={round} updateScore={us} />}
      {pg === "bets" && round && <Bets round={round} />}
      {pg === "hist" && <Hist rounds={rounds} onLoad={r => { setRound(r); sv("currentRound", r); go("bets"); }} />}
      <Nav pg={pg} go={go} hr={!!round} />
      {modal && <Mdl {...modal} />}
    </div></>
  );
}
