import { useState, useEffect, useMemo, useRef } from 'react';
import { T, PC } from '../theme';
import { calcAll } from '../utils/calc';
import { fmt$, scoreClass } from '../utils/golf';

const Scoring = ({ round, updateScore }) => {
  const [hole, setHole] = useState(() => { for (let h = 0; h < 18; h++) { if (!round.players.every(p => p.scores[h] != null)) return h; } return 17; });
  const [view, setView] = useState("hole");
  const [expGame, setExpGame] = useState(null);
  const prevHole = useRef(hole);
  const pl = round.players, n = pl.map(p => p.name.split(" ")[0]);
  const { balances, results, settlements } = useMemo(() => calcAll(round.games, pl), [round, pl]);

  const currentHoleScores = pl.map(p => p.scores[hole]).join(",");

  useEffect(() => {
    const navigated = hole !== prevHole.current;
    prevHole.current = hole;
    if (navigated) return;
    if (pl.every(p => p.scores[hole] != null) && hole < 17) {
      const isFurthestHole = !pl.some(p => p.scores.slice(hole + 1).some(s => s != null));
      if (isFurthestHole) {
        const t = setTimeout(() => setHole(h => Math.min(17, h + 1)), 1200);
        return () => clearTimeout(t);
      }
    }
  }, [currentHoleScores, hole, pl]);

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
              <div className="fx g6"><span style={{ fontSize: 12, color: T.mut, width: 16 }}>{ri + 1}.</span><span className={`pc${x.i}`} style={{ fontWeight: 600, fontSize: 14 }}>{x.name}</span></div>
              <div className="fx g8">
                <span style={{ fontSize: 14, fontWeight: 700 }}>{x.gross || "--"}</span>
                <span style={{ fontSize: 13, color: x.toPar < 0 ? T.accB : x.toPar > 0 ? T.red : T.dim, fontWeight: 600 }}>{x.played > 0 ? (x.toPar > 0 ? "+" : "") + x.toPar : "--"}</span>
                <span style={{ fontSize: 13, color: balances[x.i] < -0.01 ? T.accB : balances[x.i] > 0.01 ? T.red : T.dim, fontWeight: 600, minWidth: 48, textAlign: "right" }}>{fmt$(-balances[x.i])}</span>
              </div>
            </div>
          ))}
        </div>

        {results.length > 0 && <div className="tk"><div className="tkt">Live Bets</div>
          {results.map((r, ri) => {
            // Determine current segment for 6-6-6 games
            let currentSegment = null;
            if (r.segmentScores) {
              const h = hole;
              currentSegment = h <= 5
                ? r.segmentScores.find(s => s.range === "1-6")
                : h <= 11
                ? r.segmentScores.find(s => s.range === "7-12")
                : r.segmentScores.find(s => s.range === "13-18");
            }

            return (
              <div key={ri} style={{ marginBottom: ri < results.length - 1 ? 8 : 0 }}>
                <div className="fxb">
                  <span style={{ fontWeight: 600, color: T.txt, fontSize: 13 }}>{r.title}</span>
                  {r.status && <span style={{ fontSize: 12, color: T.accB, fontWeight: 600 }}>{r.status}</span>}
                </div>

                {/* Skins hole results */}
                {r.holeResults && (() => {
                  const sc = [0, 0, 0, 0]; r.holeResults.forEach(h => { if (h.w != null) sc[h.w] += h.v; });
                  const carry = r.holeResults.filter(h => h.r === "C").length;
                  return <div className="fx g6" style={{ marginTop: 4 }}>
                    {pl.map((_, i) => sc[i] > 0 ? <span key={i} className={`pc${i}`} style={{ fontSize: 12, fontWeight: 600 }}>{n[i]}:{sc[i]}</span> : null)}
                    {carry > 0 && <span style={{ fontSize: 12, color: T.gold }}>+{carry}carry</span>}
                  </div>;
                })()}

                {/* Current 6's segment */}
                {currentSegment && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 12, color: T.dim, marginBottom: 2 }}>
                      Holes {currentSegment.range} • {currentSegment.played}/{currentSegment.holes} played
                    </div>
                    <div className="fxb" style={{ fontSize: 12 }}>
                      <div>
                        <span className={`pc${currentSegment.t1[0]}`} style={{ fontWeight: 600 }}>{n[currentSegment.t1[0]]}</span>
                        &
                        <span className={`pc${currentSegment.t1[1]}`} style={{ fontWeight: 600 }}>{n[currentSegment.t1[1]]}</span>
                        : <span style={{ fontWeight: 700, color: currentSegment.winner === "t1" ? T.accB : T.txt }}>{currentSegment.s1}</span>
                      </div>
                      <span style={{ color: T.dim, margin: "0 6px" }}>vs</span>
                      <div>
                        <span className={`pc${currentSegment.t2[0]}`} style={{ fontWeight: 600 }}>{n[currentSegment.t2[0]]}</span>
                        &
                        <span className={`pc${currentSegment.t2[1]}`} style={{ fontWeight: 600 }}>{n[currentSegment.t2[1]]}</span>
                        : <span style={{ fontWeight: 700, color: currentSegment.winner === "t2" ? T.accB : T.txt }}>{currentSegment.s2}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>}

        <div className="fxb mb12">
          <button className="bg" disabled={hole === 0} onClick={() => setHole(hole - 1)}>{"<"} Prev</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: T.accB }}>Hole {hole + 1}</div>
            <div style={{ fontSize: 13, color: T.dim }}>Par {pl[0].teeData.pars[hole]}</div>
          </div>
          <button className="bg" disabled={hole === 17} onClick={() => setHole(hole + 1)}>Next {">"}</button>
        </div>

        {pl.map((p, pi) => {
            const par = p.teeData.pars[hole], str = p.strokeHoles[hole], sc = p.scores[hole];
            const lo = Math.max(1, par - 2), hi = par + 3;
            const range = []; for (let v = lo; v <= hi; v++) range.push(v);
            return (
              <div key={pi} className={`sec pb${pi}`}>
                <div className="fxb mb6">
                  <div className="fx g6">
                    <span className={`pc${pi}`} style={{ fontWeight: 700, fontSize: 15 }}>{n[pi]}</span>
                    {str > 0 && <span className="tag ty">{str > 1 ? str + "x" : "1 str"}</span>}
                  </div>
                  <div className="fx g6" style={{ alignItems: 'center' }}>
                    {sc != null && str > 0 && <span style={{ fontSize: 13, color: T.gold, fontWeight: 600 }}>Net: {sc - str}</span>}
                    <span style={{ fontSize: 12, color: T.dim }}>Par {par} | HCP {p.teeData.handicaps[hole]}</span>
                  </div>
                </div>
                <div className="snr">
                  {range.map(v => (
                    <button key={v} className={`snb${v === par ? " par" : ""}${sc === v ? " sel " + scoreClass(v, par) : ""}`} onClick={() => updateScore(pi, hole, v)}>{v}</button>
                  ))}
                  <button className={`snb more${sc != null && sc > hi ? " sel " + scoreClass(sc, par) : ""}`} onClick={() => updateScore(pi, hole, sc != null && sc >= hi + 1 ? sc + 1 : hi + 1)}>{sc != null && sc > hi ? sc : `${hi + 1}+`}</button>
                  <button className="snx" onClick={() => updateScore(pi, hole, null)} style={{ visibility: sc != null ? "visible" : "hidden" }}>×</button>
                </div>
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
        <th style={{ minWidth: 48, textAlign: "left", paddingLeft: 4 }}>{l}</th>
        {Array.from({ length: 9 }, (_, i) => <th key={i} className="hn">{s + i + 1}</th>)}
        <th className="tc">{s === 0 ? "OUT" : "IN"}</th>
        {s === 9 && <th className="tc">TOT</th>}
      </tr></thead><tbody>
        {pl.map((p, pi) => (
          <tr key={pi}><td style={{ textAlign: "left", paddingLeft: 4 }}><span className={`pc${pi}`} style={{ fontWeight: 600, fontSize: 12 }}>{n[pi]}</span></td>
            {Array.from({ length: 9 }, (_, i) => {
              const hi = s + i, sc = p.scores[hi], par = p.teeData.pars[hi], st = p.strokeHoles[hi];
              return <td key={i} className={`sc ${sc != null ? scoreClass(sc, par) : ""}`} onClick={() => { setHole(hi); setView("hole"); }} style={{ fontWeight: 600 }}>
                {st > 0 && <div className="sd" />}{st > 1 && <div className="sd2" />}{sc != null ? sc : "|"}</td>;
            })}
            <td className="tc">{p.scores.slice(s, s + 9).some(x => x != null) ? p.scores.slice(s, s + 9).filter(x => x != null).reduce((a, b) => a + b, 0) : "--"}</td>
            {s === 9 && <td className="tc" style={{ color: T.accB }}>{p.scores.some(x => x != null) ? p.scores.filter(x => x != null).reduce((a, b) => a + b, 0) : "--"}</td>}
          </tr>
        ))}
        <tr style={{ color: T.dim }}><td style={{ textAlign: "left", paddingLeft: 4, fontSize: 11 }}>PAR</td>
          {Array.from({ length: 9 }, (_, i) => <td key={i}>{pl[0].teeData.pars[s + i]}</td>)}
          <td className="tc">{pl[0].teeData.pars.slice(s, s + 9).reduce((a, b) => a + b, 0)}</td>
          {s === 9 && <td className="tc">{pl[0].teeData.pars.reduce((a, b) => a + b, 0)}</td>}
        </tr>
        <tr style={{ color: T.mut, fontSize: 11 }}><td style={{ textAlign: "left", paddingLeft: 4, fontSize: 11 }}>HCP</td>
          {Array.from({ length: 9 }, (_, i) => <td key={i}>{pl[0].teeData.handicaps[s + i]}</td>)}
          <td />{s === 9 && <td />}
        </tr>
      </tbody></table></div>
    );
    return <div>{rn(0, "FRONT")}{rn(9, "BACK")}</div>;
  };

  const BV = () => {
    const currentHole = (() => { for (let h = 0; h < 18; h++) { if (!pl.every(p => p.scores[h] != null)) return h; } return 17; })();

    return (
      <div>
        <div className="cd"><div className="ct">Player P&L</div>
          {pl.map((_, i) => {
            const v = -balances[i];
            return <div key={i} className={`sr ${v > 0.01 ? "sp" : v < -0.01 ? "sn" : "su"}`}>
              <span className={`pc${i}`} style={{ fontWeight: 700 }}>{n[i]}</span>
              <span style={{ fontWeight: 700 }}>{fmt$(v)}</span>
            </div>;
          })}
        </div>

        {settlements.length > 0 && <div className="cd"><div className="ct">Settlement</div>
          {settlements.map((s, i) => (
            <div key={i} className="sr sn">
              <span style={{ fontSize: 14 }}><span className={`pc${s.from}`} style={{ fontWeight: 600 }}>{n[s.from]}</span> pays <span className={`pc${s.to}`} style={{ fontWeight: 600 }}>{n[s.to]}</span></span>
              <span style={{ fontWeight: 700 }}>${s.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>}

        {results.map((r, ri) => {
          // Vegas games - rich display with expandable payouts
          if (r.title.includes("Vegas") && r.vegasData) {
            return (
              <div key={ri} className="cd" style={{ cursor: "pointer" }} onClick={() => setExpGame(expGame === ri ? null : ri)}>
                <div className="fxb mb6"><span className="ct" style={{ marginBottom: 0 }}>{r.title}</span>{r.wager && <span className="tag ty">{r.wager}</span>}</div>
                {r.status && <div style={{ fontSize: 14, fontWeight: 700, color: T.accB, marginBottom: 8 }}>{r.status}</div>}

                {/* Team summary */}
                <div style={{ marginBottom: 12 }}>
                  <div className="fxb" style={{ padding: '8px 12px', borderRadius: 8, background: T.card, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.vegasData.t1N}</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{r.vegasData.team1TotalPoints} pts</span>
                  </div>
                  <div className="fxb" style={{ padding: '8px 12px', borderRadius: 8, background: T.card }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.vegasData.t2N}</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{r.vegasData.team2TotalPoints} pts</span>
                  </div>
                </div>

                {/* Hole-by-hole table */}
                <div className="sw">
                  {[{ l: "Front 9", s: 0, e: 9 }, { l: "Back 9", s: 9, e: 18 }].map(nine => (
                    <div key={nine.l} className="mb6"><table className="sct"><thead><tr>
                      <th style={{ minWidth: 44, textAlign: "left", paddingLeft: 4 }}>{nine.l}</th>
                      {Array.from({ length: 9 }, (_, i) => <th key={i} className="hn">{nine.s + i + 1}</th>)}
                    </tr></thead><tbody>
                      <tr><td style={{ textAlign: "left", paddingLeft: 4, fontSize: 11, color: T.dim }}>T1 #</td>
                        {Array.from({ length: 9 }, (_, i) => {
                          const hr = r.holeResults[nine.s + i];
                          return <td key={i} style={{ fontSize: 11, fontWeight: hr.played ? 600 : 400, color: hr.played ? T.txt : T.mut }}>
                            {hr.played ? hr.t1Num : '|'}
                          </td>;
                        })}
                      </tr>
                      <tr><td style={{ textAlign: "left", paddingLeft: 4, fontSize: 11, color: T.dim }}>T2 #</td>
                        {Array.from({ length: 9 }, (_, i) => {
                          const hr = r.holeResults[nine.s + i];
                          return <td key={i} style={{ fontSize: 11, fontWeight: hr.played ? 600 : 400, color: hr.played ? T.txt : T.mut }}>
                            {hr.played ? hr.t2Num : '|'}
                          </td>;
                        })}
                      </tr>
                      <tr><td style={{ textAlign: "left", paddingLeft: 4, fontSize: 11, color: T.dim }}>Pts</td>
                        {Array.from({ length: 9 }, (_, i) => {
                          const hr = r.holeResults[nine.s + i];
                          const winner = hr.diff > 0 ? 1 : hr.diff < 0 ? 2 : 0;
                          return <td key={i} style={{ fontSize: 11, fontWeight: winner > 0 ? 700 : 400, color: winner === 1 ? T.accB : winner === 2 ? T.red : T.mut }}>
                            {hr.played ? (hr.diff !== 0 ? Math.abs(hr.diff) : '-') : '|'}
                          </td>;
                        })}
                      </tr>
                    </tbody></table></div>
                  ))}
                </div>

                {/* Expandable payouts */}
                {expGame === ri && r.payouts && r.payouts.length > 0 && <div className="mt8">
                  <div className="il mb6">Payouts</div>
                  {r.payouts.map((p, j) => (
                    <div key={j} style={{ fontSize: 13, marginBottom: 4 }}>
                      <span className={`pc${p.f}`} style={{ fontWeight: 600 }}>{n[p.f]}</span> → <span className={`pc${p.t}`} style={{ fontWeight: 600 }}>{n[p.t]}</span>: <span style={{ fontWeight: 700 }}>{fmt$(p.a)}</span>
                    </div>
                  ))}
                </div>}

                <div style={{ textAlign: "center", fontSize: 12, color: T.mut, marginTop: 6 }}>{expGame === ri ? "Hide" : "Tap for details"}</div>
              </div>
            );
          }

          // 6-6-6 games - rich segment display with expandable payouts
          if (r.title.includes("6-6-6") && r.segmentScores) {
            return (
              <div key={ri} className="cd" style={{ cursor: "pointer" }} onClick={() => setExpGame(expGame === ri ? null : ri)}>
                <div className="fxb mb6"><span className="ct" style={{ marginBottom: 0 }}>{r.title}</span>{r.wager && <span className="tag ty">{r.wager.replace('/pl', '/player').replace('/seg', '/segment').replace(/^\$([^/]+)\/\$([^/]+)\/\$([^/]+)$/, 'F:$$$1 B:$$$2 O:$$$3')}</span>}</div>
                {r.segmentScores.map((seg, si) => {
                  const isActive = currentHole >= (seg.range === "1-6" ? 0 : seg.range === "7-12" ? 6 : 12) && currentHole <= (seg.range === "1-6" ? 5 : seg.range === "7-12" ? 11 : 17);
                  return (
                    <div key={si} style={{ padding: '10px 12px', borderRadius: 10, marginBottom: 8, border: `1.5px solid ${isActive ? T.acc : T.bdr}`, background: isActive ? T.accD + '15' : 'transparent' }}>
                      <div style={{ fontSize: 13, color: isActive ? T.accB : T.dim, marginBottom: 6, fontWeight: isActive ? 600 : 400 }}>
                        Holes {seg.range}{isActive ? ' (current)' : ''}
                      </div>
                      <div className="fxb mb6">
                        <div style={{ textAlign: "center", flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}><span className={`pc${seg.t1[0]}`}>{n[seg.t1[0]]}</span> & <span className={`pc${seg.t1[1]}`}>{n[seg.t1[1]]}</span></div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: seg.winner === "t1" ? T.accB : T.txt, marginTop: 4 }}>{seg.s1}</div>
                        </div>
                        <div style={{ fontSize: 13, color: T.dim, alignSelf: "center" }}>vs</div>
                        <div style={{ textAlign: "center", flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}><span className={`pc${seg.t2[0]}`}>{n[seg.t2[0]]}</span> & <span className={`pc${seg.t2[1]}`}>{n[seg.t2[1]]}</span></div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: seg.winner === "t2" ? T.accB : T.txt, marginTop: 4 }}>{seg.s2}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: T.dim, textAlign: "center" }}>{seg.played}/{seg.holes} holes played</div>
                    </div>
                  );
                })}

                {/* Expandable payouts */}
                {expGame === ri && r.payouts && r.payouts.length > 0 && <div className="mt8">
                  <div className="il mb6">Payouts</div>
                  {r.payouts.map((p, j) => (
                    <div key={j} style={{ fontSize: 13, marginBottom: 4 }}>
                      <span className={`pc${p.f}`} style={{ fontWeight: 600 }}>{n[p.f]}</span> → <span className={`pc${p.t}`} style={{ fontWeight: 600 }}>{n[p.t]}</span>: <span style={{ fontWeight: 700 }}>{fmt$(p.a)}</span>
                    </div>
                  ))}
                </div>}

                <div style={{ textAlign: "center", fontSize: 12, color: T.mut, marginTop: 6 }}>{expGame === ri ? "Hide" : "Tap for details"}</div>
              </div>
            );
          }

          // All other games - standard expandable display
          return (
            <div key={ri} className="cd" style={{ cursor: "pointer" }} onClick={() => setExpGame(expGame === ri ? null : ri)}>
              <div className="fxb mb6"><span className="ct" style={{ marginBottom: 0 }}>{r.title}</span>{r.wager && <span className="tag ty">{r.wager.replace('/pl', '/player').replace('/seg', '/segment').replace(/^\$([^/]+)\/\$([^/]+)\/\$([^/]+)$/, 'F:$$$1 B:$$$2 O:$$$3')}</span>}</div>
              {r.status && <div style={{ fontSize: 14, fontWeight: 700, color: T.accB, marginBottom: 6 }}>{r.status}</div>}
              {expGame === ri && <div style={{ marginTop: 8 }}>
                {r.details?.map((d, j) => <div key={j} style={{ fontSize: 13, color: T.dim, marginBottom: 4, lineHeight: 1.4 }}>{d}</div>)}
                {r.payouts && r.payouts.length > 0 && <div className="mt8">
                  <div className="il mb6">Payouts</div>
                  {r.payouts.map((p, j) => (
                    <div key={j} style={{ fontSize: 13, marginBottom: 4 }}>
                      <span className={`pc${p.f}`} style={{ fontWeight: 600 }}>{n[p.f]}</span> → <span className={`pc${p.t}`} style={{ fontWeight: 600 }}>{n[p.t]}</span>: <span style={{ fontWeight: 700 }}>{fmt$(p.a)}</span>
                    </div>
                  ))}
                </div>}
                {r.holeResults && r.holeResults[0] && r.holeResults[0].w !== undefined && <div className="mt8">
                  <div className="il mb6">Skins by Hole</div>
                  {[{ l: "Front 9", s: 0, e: 9 }, { l: "Back 9", s: 9, e: 18 }].map(nine => (
                    <div key={nine.l} className="sw mb6"><table className="sct"><thead><tr>
                      <th style={{ minWidth: 44, textAlign: "left", paddingLeft: 4 }}>{nine.l}</th>
                      {Array.from({ length: 9 }, (_, i) => <th key={i} className="hn">{nine.s + i + 1}</th>)}
                    </tr></thead><tbody>
                      {pl.map((p, pi) => (
                        <tr key={pi}><td style={{ textAlign: "left", paddingLeft: 4 }}><span className={`pc${pi}`} style={{ fontWeight: 600, fontSize: 12 }}>{n[pi]}</span></td>
                          {Array.from({ length: 9 }, (_, i) => {
                            const hi = nine.s + i, sc = p.scores[hi], hri = r.holeResults[hi];
                            const isW = hri && hri.w === pi;
                            return <td key={i} style={{ fontSize: 12, fontWeight: isW ? 800 : 500, color: isW ? PC[pi] : sc != null ? T.txt : T.mut, background: isW ? PC[pi] + "15" : "transparent" }}>{sc != null ? sc : "|"}</td>;
                          })}
                        </tr>
                      ))}
                      <tr><td style={{ textAlign: "left", paddingLeft: 4, fontSize: 11, color: T.mut }}>Skin</td>
                        {Array.from({ length: 9 }, (_, i) => {
                          const hri = r.holeResults[nine.s + i];
                          return <td key={i} style={{ fontSize: 11, fontWeight: 700, color: hri && hri.w != null ? PC[hri.w] : T.mut }}>
                            {hri ? hri.w != null ? (hri.v > 1 ? hri.v + "W" : "W") : hri.r === "--" ? "|" : hri.r : "|"}
                          </td>;
                        })}
                      </tr>
                    </tbody></table></div>
                  ))}
                  <div className="fx fw g6" style={{ justifyContent: "center" }}>
                    {pl.map((_, i) => {
                      const cnt = r.holeResults.filter(h => h.w === i).reduce((a, h) => a + h.v, 0);
                      return cnt > 0 ? <span key={i} className={`pc${i}`} style={{ fontSize: 13, fontWeight: 700 }}>{n[i]}: {cnt} skin{cnt !== 1 ? "s" : ""}</span> : null;
                    })}
                  </div>
                </div>}
              </div>}
              <div style={{ textAlign: "center", fontSize: 12, color: T.mut, marginTop: 6 }}>{expGame === ri ? "Hide" : "Tap for details"}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="pg">
      <div className="tabs">
        <button className={`tab ${view === "hole" ? "on" : ""}`} onClick={() => setView("hole")}>By Hole</button>
        <button className={`tab ${view === "card" ? "on" : ""}`} onClick={() => setView("card")}>Card</button>
        {round.games?.length > 0 && <button className={`tab ${view === "bets" ? "on" : ""}`} onClick={() => setView("bets")}>Bets</button>}
      </div>
      {view === "hole" ? <HV /> : view === "card" ? <CV /> : <BV />}
    </div>
  );
};

export default Scoring;
