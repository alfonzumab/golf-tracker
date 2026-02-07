import { GT } from '../theme';
import { sixPairs } from './golf';

export function calcAll(games, players) {
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
      if (s1.total < s2.total) { for (const loser of t2) for (const winner of t1) pay.push({ f: loser, t: winner, a: w / t1.length }); }
      else if (s2.total < s1.total) { for (const loser of t1) for (const winner of t2) pay.push({ f: loser, t: winner, a: w / t2.length }); }
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
    if (s.w1 > s.w2) { for (const loser of t2) for (const winner of t1) pay.push({ f: loser, t: winner, a: w / t1.length }); }
    else if (s.w2 > s.w1) { for (const loser of t1) for (const winner of t2) pay.push({ f: loser, t: winner, a: w / t2.length }); }
  };
  if (fr.p > 0) pm(fr, g.wagerFront);
  if (bk.p > 0) pm(bk, g.wagerBack);
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
  const pairs = g.pairs || sixPairs();
  const det = [], pay = [];
  const segmentScores = [];
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
    if (w === "t1") { for (const loser of t2) for (const winner of t1) pay.push({ f: loser, t: winner, a: wg / t1.length }); }
    else if (w === "t2") { for (const loser of t1) for (const winner of t2) pay.push({ f: loser, t: winner, a: wg / t2.length }); }
  }
  return { title: "6-6-6 (" + (g.mode === "match" ? "Match" : "Stroke") + ")", details: det, payouts: pay, wager: "$" + g.wagerPerSegment + "/seg", pairs, segmentScores };
}
