import { useState, useEffect, useMemo } from 'react';
import { T, PC } from '../theme';
import { calcAll } from '../utils/calc';
import { fmt$, scoreClass } from '../utils/golf';

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

export default Scoring;
