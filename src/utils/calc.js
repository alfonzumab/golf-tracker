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
  const wF = g.wagerFront || 0, wB = g.wagerBack || 0, wO = g.wagerOverall || 0;
  const wTag = "$" + wF + "/$" + wB + "/$" + wO;
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
    if (fr1.holes > 0) pm(fr1, fr2, wF);
    if (bk1.holes > 0) pm(bk1, bk2, wB);
    if (ov1.holes === 18 && ov1.total !== ov2.total) pm(ov1, ov2, wO);
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
    return { title: "Stroke 2v2 (" + (g.net ? "Net" : "Gross") + " BB)", details: [t1N + " vs " + t2N, fs(fr1, fr2, "F9"), fs(bk1, bk2, "B9"), fs(ov1, ov2, "18")], status: st, payouts: pay, wager: wTag };
  }
  // Individual stroke with front/back/overall
  const calcSeg = (start, end) => pl.map((p, i) => {
    let total = 0, holes = 0;
    for (let h = start; h < end; h++) {
      if (p.scores[h] != null) { total += g.net ? p.scores[h] - p.strokeHoles[h] : p.scores[h]; holes++; }
    }
    return { i, total, holes };
  });
  const fr = calcSeg(0, 9), bk = calcSeg(9, 18);
  const ov = pl.map((_, i) => ({ i, total: fr[i].total + bk[i].total, holes: fr[i].holes + bk[i].holes }));
  if (!ov.some(s => s.holes > 0)) return { title: "Stroke (" + (g.net ? "Net" : "Gross") + ")", details: ["No scores"], payouts: [], wager: wTag };
  const fs = (scores, expected, label) => {
    if (!scores.some(s => s.holes > 0)) return label + ": --";
    const best = Math.min(...scores.map(s => s.total));
    const ws = scores.filter(s => s.total === best);
    if (scores.every(s => s.holes === expected)) return ws.length === 1 ? label + ": " + n[ws[0].i] + " (" + best + ")" : label + ": Tie (" + best + ")";
    const leader = [...scores].sort((a, b) => a.total - b.total)[0];
    return label + ": " + n[leader.i] + " (" + leader.total + ", " + leader.holes + "h)";
  };
  const pay = [];
  const pm = (scores, expected, wager) => {
    if (!scores.every(s => s.holes === expected) || wager <= 0) return;
    const best = Math.min(...scores.map(s => s.total));
    const ws = scores.filter(s => s.total === best), ls = scores.filter(s => s.total !== best);
    if (ws.length < scores.length) { for (const loser of ls) for (const winner of ws) pay.push({ f: loser.i, t: winner.i, a: wager / ws.length }); }
  };
  pm(fr, 9, wF); pm(bk, 9, wB); pm(ov, 18, wO);
  const det = pl.map((p, i) => {
    const gr = p.scores.filter(s => s != null).reduce((a, b) => a + b, 0), h = p.scores.filter(s => s != null).length;
    return n[i] + ": " + gr + (g.net ? " (net " + ov[i].total + ", CH " + p.courseHandicap + ")" : "") + " " + h + "/18";
  });
  const sorted = [...ov].sort((a, b) => a.total - b.total);
  const st = ov.some(s => s.holes > 0) ? "Leader: " + n[sorted[0].i] + " (" + (g.net ? "net " : "") + sorted[0].total + ")" : "";
  return { title: "Stroke (" + (g.net ? "Net" : "Gross") + ")", details: [fs(fr, 9, "F9"), fs(bk, 9, "B9"), fs(ov, 18, "18"), ...det], status: st, payouts: pay, wager: wTag };
}

function cMatch(g, pl) {
  const n = pl.map(p => p.name.split(" ")[0]);
  const wF = g.wagerFront || 0, wB = g.wagerBack || 0, wO = g.wagerOverall || 0;
  const wTag = "$" + wF + "/$" + wB + "/$" + wO;
  if (g.matchups) {
    // Individual match: 1v1 matchups
    const pay = [], det = [], statuses = [];
    for (const [a, b] of g.matchups) {
      const aN = n[a], bN = n[b];
      const seg = (s, e) => {
        let w1 = 0, w2 = 0, p = 0;
        for (let h = s; h < e; h++) {
          if (pl[a].scores[h] == null || pl[b].scores[h] == null) continue; p++;
          const sa = pl[a].scores[h] - pl[a].strokeHoles[h], sb = pl[b].scores[h] - pl[b].strokeHoles[h];
          if (sa < sb) w1++; else if (sb < sa) w2++;
        } return { w1, w2, p };
      };
      const fr = seg(0, 9), bk = seg(9, 18), ov = { w1: fr.w1 + bk.w1, w2: fr.w2 + bk.w2, p: fr.p + bk.p };
      const fs = (s, l) => { if (!s.p) return l + ": --"; if (s.w1 > s.w2) return l + ": " + aN + " (" + s.w1 + "-" + s.w2 + ")"; if (s.w2 > s.w1) return l + ": " + bN + " (" + s.w2 + "-" + s.w1 + ")"; return l + ": Push"; };
      const pm = (s, w) => { if (s.w1 > s.w2) pay.push({ f: b, t: a, a: w }); else if (s.w2 > s.w1) pay.push({ f: a, t: b, a: w }); };
      if (fr.p > 0) pm(fr, wF);
      if (bk.p > 0) pm(bk, wB);
      if (ov.p === 18 && ov.w1 !== ov.w2) pm(ov, wO);
      det.push(aN + " vs " + bN + ": " + fs(fr, "F9") + " | " + fs(bk, "B9") + " | " + fs(ov, "18"));
      if (ov.p > 0) {
        const d = ov.w1 - ov.w2, r = 18 - ov.p;
        if (r > 0) { if (d > 0) statuses.push(aN + " " + d + "UP"); else if (d < 0) statuses.push(bN + " " + (-d) + "UP"); else statuses.push(aN + "/" + bN + " AS"); }
        else { if (d > 0) statuses.push(aN + " WIN " + ov.w1 + "-" + ov.w2); else if (d < 0) statuses.push(bN + " WIN " + ov.w2 + "-" + ov.w1); else statuses.push(aN + "/" + bN + " HALVED"); }
      }
    }
    return { title: "Match (1v1 Net)", details: det, status: statuses.join(" | "), payouts: pay, wager: wTag };
  }
  const t1 = g.team1, t2 = g.team2;
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
  if (fr.p > 0) pm(fr, wF);
  if (bk.p > 0) pm(bk, wB);
  if (ov.p === 18 && ov.w1 !== ov.w2) pm(ov, wO);
  let st = "";
  if (ov.p > 0) {
    const d = ov.w1 - ov.w2, r = 18 - ov.p;
    if (r > 0) { if (d > 0) st = t1N + " " + d + "UP (" + r + " left)"; else if (d < 0) st = t2N + " " + (-d) + "UP (" + r + " left)"; else st = "AS (" + r + " left)"; }
    else { if (d > 0) st = t1N + " WIN " + ov.w1 + "-" + ov.w2; else if (d < 0) st = t2N + " WIN " + ov.w2 + "-" + ov.w1; else st = "HALVED"; }
  }
  return { title: "Match (2v2 BB)", details: [t1N + " vs " + t2N, fs(fr, "F9"), fs(bk, "B9"), fs(ov, "18")], status: st, payouts: pay, wager: wTag };
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
