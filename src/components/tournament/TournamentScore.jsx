import { useState, useEffect, useMemo } from 'react';
import { T, PC } from '../../theme';
import { scoreClass, enrichPlayer } from '../../utils/golf';

const TournamentScore = ({ tournament, playerInfo, onUpdateScore, onSelectPlayer }) => {
  const teeData = tournament.course.tees?.find(t => t.name === tournament.teeName) || tournament.course.tees?.[0];

  // Player picker if not yet identified
  if (!playerInfo) {
    return (
      <div className="pg">
        <div className="cd">
          <div className="ct">Select Your Player</div>
          <p style={{ fontSize: 13, color: T.dim, marginBottom: 12 }}>Tap your name to start scoring</p>
          {tournament.groups.map((g, gi) => (
            <div key={gi} className="t-grp">
              <div className="t-grp-h">Group {gi + 1}</div>
              {g.players.map((p, pi) => (
                <div key={pi} className="t-grp-p" style={{ cursor: 'pointer', padding: '12px 10px', borderRadius: 8, marginBottom: 4, border: `1px solid ${T.bdr}` }}
                  onClick={() => onSelectPlayer({ code: tournament.shareCode, groupIdx: gi, playerIdx: pi, playerName: p.name, tournamentName: tournament.name })}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontSize: 13, color: T.dim, marginLeft: 8 }}>Index: {p.index}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!teeData) {
    return <div className="pg"><div className="cd"><div className="ct">Missing tee data</div><p style={{ fontSize: 13, color: T.dim }}>This tournament was created before tee data was stored. Please create a new tournament.</p></div></div>;
  }

  const group = tournament.groups[playerInfo.groupIdx];
  const pl = useMemo(() => group.players.map(p => enrichPlayer(p, teeData)), [group.players, teeData]);
  const n = pl.map(p => p.name.split(" ")[0]);

  const [hole, setHole] = useState(() => { for (let h = 0; h < 18; h++) { if (!pl.every(p => p.scores[h] != null)) return h; } return 17; });
  const [view, setView] = useState("hole");

  // Auto-advance hole
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
        <div style={{ fontSize: 13, color: T.accB, textAlign: 'center', marginBottom: 8 }}>Group {playerInfo.groupIdx + 1}</div>
        <div className="tk"><div className="tkt">Leaderboard</div>
          {lb.map((x, ri) => (
            <div key={x.i} className="tkr">
              <div className="fx g6"><span style={{ fontSize: 12, color: T.mut, width: 16 }}>{ri + 1}.</span><span className={`pc${x.i}`} style={{ fontWeight: 600, fontSize: 14 }}>{x.name}</span></div>
              <div className="fx g8">
                <span style={{ fontSize: 14, fontWeight: 700 }}>{x.gross || "--"}</span>
                <span style={{ fontSize: 13, color: x.toPar < 0 ? T.accB : x.toPar > 0 ? T.red : T.dim, fontWeight: 600 }}>{x.played > 0 ? (x.toPar > 0 ? "+" : "") + x.toPar : "--"}</span>
                <span style={{ fontSize: 13, color: T.dim, minWidth: 36, textAlign: "right" }}>{x.played > 0 ? `${x.played}h` : ""}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="fxb mb12">
          <button className="bg" disabled={hole === 0} onClick={() => setHole(hole - 1)}>{"<"} Prev</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: T.accB }}>Hole {hole + 1}</div>
            <div style={{ fontSize: 13, color: T.dim }}>Par {teeData.pars[hole]}</div>
          </div>
          <button className="bg" disabled={hole === 17} onClick={() => setHole(hole + 1)}>Next {">"}</button>
        </div>

        {pl.map((p, pi) => {
          const par = p.teeData.pars[hole], str = p.strokeHoles[hole], sc = p.scores[hole];
          return (
            <div key={pi} className={`sec pb${pi}`}>
              <div className="fxb mb6">
                <div className="fx g6">
                  <span className={`pc${pi}`} style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</span>
                  {str > 0 && <span className="tag ty">{str > 1 ? str + "x" : "1 str"}</span>}
                </div>
                <span style={{ fontSize: 12, color: T.dim }}>Par {par} | HCP {p.teeData.handicaps[hole]}</span>
              </div>
              <div className="fx g6" style={{ justifyContent: "center" }}>
                <button className="seb" onClick={() => onUpdateScore(playerInfo.groupIdx, pi, hole, Math.max(1, (sc || par) - 1))}>{"-"}</button>
                <div className={`sev ${sc != null ? scoreClass(sc, par) : ""}`}>{sc != null ? sc : "--"}</div>
                <button className="seb" onClick={() => onUpdateScore(playerInfo.groupIdx, pi, hole, Math.min(15, (sc || par) + 1))}>+</button>
                <button className="seb" onClick={() => onUpdateScore(playerInfo.groupIdx, pi, hole, par)} style={{ fontSize: 13, width: 56 }}>Par</button>
                <button className="secl" onClick={() => onUpdateScore(playerInfo.groupIdx, pi, hole, null)} style={{ visibility: sc != null ? "visible" : "hidden" }}>{"x"}</button>
              </div>
              {sc != null && str > 0 && <div style={{ textAlign: "center", marginTop: 6, fontSize: 13, color: T.gold }}>Net: {sc - str}</div>}
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
          {Array.from({ length: 9 }, (_, i) => <td key={i}>{teeData.pars[s + i]}</td>)}
          <td className="tc">{teeData.pars.slice(s, s + 9).reduce((a, b) => a + b, 0)}</td>
          {s === 9 && <td className="tc">{teeData.pars.reduce((a, b) => a + b, 0)}</td>}
        </tr>
        <tr style={{ color: T.mut, fontSize: 11 }}><td style={{ textAlign: "left", paddingLeft: 4, fontSize: 11 }}>HCP</td>
          {Array.from({ length: 9 }, (_, i) => <td key={i}>{teeData.handicaps[s + i]}</td>)}
          <td />{s === 9 && <td />}
        </tr>
      </tbody></table></div>
    );
    return <div><div style={{ fontSize: 13, color: T.accB, textAlign: 'center', marginBottom: 8 }}>Group {playerInfo.groupIdx + 1}</div>{rn(0, "FRONT")}{rn(9, "BACK")}</div>;
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

export default TournamentScore;
