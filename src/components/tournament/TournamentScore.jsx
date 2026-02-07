import { useState, useEffect, useMemo } from 'react';
import { T, PC, GT } from '../../theme';
import { scoreClass, enrichPlayer, fmt$, sixPairs } from '../../utils/golf';
import { calcAll } from '../../utils/calc';
import { calcTournamentSkins } from '../../utils/tournamentCalc';
import Tog from '../Toggle';

const TournamentScore = ({ tournament, playerInfo, onUpdateScore, onSelectPlayer, onUpdateGroupGames }) => {
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

  // Tournament-wide skins config
  const skinsConfig = tournament.tournamentGames?.find(g => g.type === 'skins');
  const has4 = pl.length === 4;

  // Group games state
  const groupGames = group.games || [];
  const [editing, setEditing] = useState(false);
  const [editGames, setEditGames] = useState(groupGames);
  const [showAddGame, setShowAddGame] = useState(false);

  const startEdit = () => { setEditGames(groupGames.length > 0 ? [...groupGames] : []); setEditing(true); };
  const saveGroupGames = () => { onUpdateGroupGames(playerInfo.groupIdx, editGames); setEditing(false); };
  const addGame = t => {
    const g = { type: t, id: Date.now() };
    if (t === GT.STROKE) Object.assign(g, { net: true, wagerPerPlayer: 10 });
    else if (t === GT.MATCH) Object.assign(g, { team1: [0, 1], team2: [2, 3], wagerFront: 5, wagerBack: 5, wagerOverall: 10 });
    else if (t === GT.SKINS) Object.assign(g, { net: true, carryOver: true, potPerPlayer: 20 });
    else Object.assign(g, { mode: "match", wagerPerSegment: 5, pairs: sixPairs() });
    setEditGames([...editGames, g]); setShowAddGame(false);
  };
  const ug = (id, up) => setEditGames(editGames.map(g => g.id === id ? { ...g, ...up } : g));

  const BV = () => {
    // Section 1: Tournament-wide skins
    const skinsSection = skinsConfig ? (() => {
      const allPlayers = [];
      tournament.groups.forEach((g, gi) => {
        g.players.forEach(p => {
          const enriched = enrichPlayer(p, teeData);
          allPlayers.push({ ...enriched, groupIdx: gi });
        });
      });
      const sr = calcTournamentSkins(skinsConfig, allPlayers);
      return (
        <div className="cd">
          <div className="ct">Tournament Skins</div>
          <div className="fxb mb6">
            <span style={{ fontSize: 13, color: T.dim }}>Pot: ${sr.pot} ({allPlayers.length} x ${skinsConfig.potPerPlayer})</span>
            <span style={{ fontSize: 13, color: T.dim }}>{sr.totalSkins} skin{sr.totalSkins !== 1 ? "s" : ""}{sr.carry > 0 ? ` (${sr.carry} carrying)` : ""}</span>
          </div>
          {sr.totalSkins > 0 && <div style={{ fontSize: 12, color: T.dim, marginBottom: 8 }}>${sr.perSkin.toFixed(2)}/skin | {skinsConfig.net ? "Net" : "Gross"}{skinsConfig.carryOver ? " | Carry" : ""}</div>}
          {sr.playerResults.filter(p => p.skins > 0 || p.netPL !== 0).map((p, i) => (
            <div key={i} className={`sr ${p.netPL > 0.01 ? "sp" : p.netPL < -0.01 ? "sn" : "su"}`}>
              <span style={{ fontSize: 14 }}>{p.name} <span style={{ fontSize: 12, color: T.dim }}>G{p.groupIdx + 1}</span></span>
              <span style={{ fontSize: 14 }}>{p.skins} skin{p.skins !== 1 ? "s" : ""} <span style={{ fontWeight: 700 }}>{p.netPLStr}</span></span>
            </div>
          ))}
          {sr.totalSkins === 0 && <div style={{ fontSize: 13, color: T.dim, textAlign: "center" }}>No skins awarded yet</div>}
        </div>
      );
    })() : null;

    // Section 2: Group games
    const groupSection = (() => {
      if (editing) {
        return (
          <div>
            <div className="fxb mb8">
              <span className="ct" style={{ marginBottom: 0 }}>Group {playerInfo.groupIdx + 1} Games</span>
              <button className="btn bp bsm" onClick={() => setShowAddGame(true)}>+ Add</button>
            </div>
            {showAddGame && <div className="cd"><div className="g2">
              <button className="btn bs" onClick={() => addGame(GT.STROKE)}>Stroke</button>
              <button className="btn bs" onClick={() => addGame(GT.SKINS)}>Skins</button>
              <button className="btn bs" disabled={!has4} onClick={() => has4 && addGame(GT.MATCH)}>Match</button>
              <button className="btn bs" disabled={!has4} onClick={() => has4 && addGame(GT.SIXES)}>6-6-6</button>
            </div>{!has4 && <p style={{ fontSize: 12, color: T.dim, marginTop: 6 }}>Match/6-6-6 need 4 players</p>}</div>}
            {editGames.map(g => (
              <div key={g.id} className="cd">
                <div className="fxb mb6">
                  <span className="ct" style={{ marginBottom: 0 }}>{g.type === GT.STROKE ? "Stroke" : g.type === GT.MATCH ? "Match" : g.type === GT.SKINS ? "Skins" : "6-6-6"}</span>
                  <button style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 13 }} onClick={() => setEditGames(editGames.filter(x => x.id !== g.id))}>Remove</button>
                </div>
                {g.type === GT.STROKE && <>
                  <Tog label="Net" v={g.net} onChange={v => ug(g.id, { net: v })} />
                  <div><div className="il">$/player</div><input className="inp" type="number" value={g.wagerPerPlayer} onChange={e => ug(g.id, { wagerPerPlayer: parseFloat(e.target.value) || 0 })} /></div>
                </>}
                {g.type === GT.MATCH && <>
                  <p style={{ fontSize: 13, color: T.dim, marginBottom: 8 }}>Players 1&2 vs 3&4</p>
                  <div className="g3">{[["Front", "wagerFront"], ["Back", "wagerBack"], ["Overall", "wagerOverall"]].map(([l, k]) =>
                    <div key={k}><div className="il">{l} $</div><input className="inp ism" style={{ width: "100%" }} type="number" value={g[k]} onChange={e => ug(g.id, { [k]: parseFloat(e.target.value) || 0 })} /></div>
                  )}</div>
                </>}
                {g.type === GT.SKINS && <>
                  <Tog label="Net" v={g.net} onChange={v => ug(g.id, { net: v })} />
                  <Tog label="Carry-over" v={g.carryOver} onChange={v => ug(g.id, { carryOver: v })} />
                  <div><div className="il">Pot $/player</div><input className="inp" type="number" value={g.potPerPlayer} onChange={e => ug(g.id, { potPerPlayer: parseFloat(e.target.value) || 0 })} /></div>
                </>}
                {g.type === GT.SIXES && <>
                  <div className="il mb6">Format</div>
                  <div className="fx g6 mb10">
                    <button className={`chip ${g.mode === "match" ? "sel" : ""}`} onClick={() => ug(g.id, { mode: "match" })}>Match</button>
                    <button className={`chip ${g.mode === "stroke" ? "sel" : ""}`} onClick={() => ug(g.id, { mode: "stroke" })}>Stroke</button>
                  </div>
                  <div><div className="il">$/segment/person</div><input className="inp" type="number" value={g.wagerPerSegment} onChange={e => ug(g.id, { wagerPerSegment: parseFloat(e.target.value) || 0 })} /></div>
                </>}
              </div>
            ))}
            <div className="fx g8">
              <button className="btn bs" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn bp" style={{ flex: 2 }} onClick={saveGroupGames}>Save Games</button>
            </div>
          </div>
        );
      }

      // Show results if group has games
      if (groupGames.length > 0 && has4) {
        const { results, settlements, balances } = calcAll(groupGames, pl);
        return (
          <div>
            <div className="fxb mb8">
              <span className="ct" style={{ marginBottom: 0 }}>Group {playerInfo.groupIdx + 1} Games</span>
              <button className="btn bg bsm" onClick={startEdit}>Edit</button>
            </div>
            <div className="cd"><div className="ct">Group P&L</div>
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
            {results.map((r, ri) => (
              <div key={ri} className="cd">
                <div className="fxb mb6"><span className="ct" style={{ marginBottom: 0 }}>{r.title}</span>{r.wager && <span className="tag ty">{r.wager}</span>}</div>
                {r.status && <div style={{ fontSize: 14, fontWeight: 700, color: T.accB, marginBottom: 6 }}>{r.status}</div>}
                {r.details?.map((d, j) => <div key={j} style={{ fontSize: 13, color: T.dim, marginBottom: 4, lineHeight: 1.4 }}>{d}</div>)}
              </div>
            ))}
          </div>
        );
      }

      // No group games yet
      return (
        <div>
          <div className="fxb mb8">
            <span className="ct" style={{ marginBottom: 0 }}>Group {playerInfo.groupIdx + 1} Games</span>
          </div>
          <div className="cd" style={{ textAlign: "center" }}>
            <p style={{ fontSize: 14, color: T.dim, marginBottom: 12 }}>{groupGames.length > 0 && !has4 ? "Group games require 4 players" : "No group games yet"}</p>
            <button className="btn bp" onClick={startEdit}>Add Group Games</button>
          </div>
        </div>
      );
    })();

    return (
      <div>
        {skinsSection}
        {skinsSection && groupSection && <div className="dvd" style={{ margin: '12px 0' }} />}
        {groupSection}
      </div>
    );
  };

  const showBets = skinsConfig || groupGames.length > 0 || has4;

  return (
    <div className="pg">
      <div className="tabs">
        <button className={`tab ${view === "hole" ? "on" : ""}`} onClick={() => setView("hole")}>By Hole</button>
        <button className={`tab ${view === "card" ? "on" : ""}`} onClick={() => setView("card")}>Card</button>
        {showBets && <button className={`tab ${view === "bets" ? "on" : ""}`} onClick={() => setView("bets")}>Bets</button>}
      </div>
      {view === "hole" ? <HV /> : view === "card" ? <CV /> : <BV />}
    </div>
  );
};

export default TournamentScore;
