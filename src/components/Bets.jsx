import { useState, useMemo } from 'react';
import { T, PC } from '../theme';
import { calcAll } from '../utils/calc';
import { fmt$ } from '../utils/golf';

const Bets = ({ round }) => {
  const pl = round.players, n = pl.map(p => p.name.split(" ")[0]);
  const { results, settlements, balances } = useMemo(() => calcAll(round.games, pl), [round]);
  const [exp, setExp] = useState(null);

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

      {results.filter(r => r.title.includes("6-6-6") && r.segmentScores).map((r, ri) => {
        const activeSeg = r.segmentScores.find(seg => currentHole >= (seg.range === "1-6" ? 0 : seg.range === "7-12" ? 6 : 12) && currentHole <= (seg.range === "1-6" ? 5 : seg.range === "7-12" ? 11 : 17));
        if (!activeSeg) return null;
        return (
          <div key={ri} className="cd">
            <div className="ct">Active: {r.title}</div>
            <div style={{ fontSize: 13, color: T.dim, marginBottom: 8 }}>Holes {activeSeg.range}</div>
            <div className="fxb mb6">
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}><span className={`pc${activeSeg.t1[0]}`}>{n[activeSeg.t1[0]]}</span> & <span className={`pc${activeSeg.t1[1]}`}>{n[activeSeg.t1[1]]}</span></div>
                <div style={{ fontSize: 22, fontWeight: 700, color: activeSeg.winner === "t1" ? T.accB : T.txt, marginTop: 4 }}>{activeSeg.s1}</div>
              </div>
              <div style={{ fontSize: 13, color: T.dim, alignSelf: "center" }}>vs</div>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}><span className={`pc${activeSeg.t2[0]}`}>{n[activeSeg.t2[0]]}</span> & <span className={`pc${activeSeg.t2[1]}`}>{n[activeSeg.t2[1]]}</span></div>
                <div style={{ fontSize: 22, fontWeight: 700, color: activeSeg.winner === "t2" ? T.accB : T.txt, marginTop: 4 }}>{activeSeg.s2}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: T.dim, textAlign: "center" }}>{activeSeg.played}/{activeSeg.holes} holes played</div>
          </div>
        );
      })}

      {settlements.length > 0 && <div className="cd"><div className="ct">Settlement</div>
        {settlements.map((s, i) => (
          <div key={i} className="sr sn">
            <span style={{ fontSize: 14 }}><span className={`pc${s.from}`} style={{ fontWeight: 600 }}>{n[s.from]}</span> pays <span className={`pc${s.to}`} style={{ fontWeight: 600 }}>{n[s.to]}</span></span>
            <span style={{ fontWeight: 700 }}>${s.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>}
      {results.map((r, ri) => (
        <div key={ri} className="cd" style={{ cursor: "pointer" }} onClick={() => setExp(exp === ri ? null : ri)}>
          <div className="fxb mb6"><span className="ct" style={{ marginBottom: 0 }}>{r.title}</span>{r.wager && <span className="tag ty">{r.wager}</span>}</div>
          {r.status && <div style={{ fontSize: 14, fontWeight: 700, color: T.accB, marginBottom: 6 }}>{r.status}</div>}
          {exp === ri && <div style={{ marginTop: 8 }}>
            {r.details?.map((d, j) => <div key={j} style={{ fontSize: 13, color: T.dim, marginBottom: 4, lineHeight: 1.4 }}>{d}</div>)}
            {r.holeResults && <div className="mt8">
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
          <div style={{ textAlign: "center", fontSize: 12, color: T.mut, marginTop: 6 }}>{exp === ri ? "Hide" : "Tap for details"}</div>
        </div>
      ))}
    </div>
  );
};

export default Bets;
