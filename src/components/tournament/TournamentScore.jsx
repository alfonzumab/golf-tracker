import { useState, useEffect, useMemo, useRef } from 'react';
import { T, PC, GT, TT } from '../../theme';
import { scoreClass, enrichPlayer, fmt$, sixPairs } from '../../utils/golf';
import { calcAll } from '../../utils/calc';
import { calcTournamentSkins, calcMatchPlay, calcRyderCupStandings } from '../../utils/tournamentCalc';
import Tog from '../Toggle';

const TournamentScore = ({ tournament, playerInfo, onUpdateScore, onSelectPlayer, onUpdateGroupGames }) => {
  const teeData = tournament.course.tees?.find(t => t.name === tournament.teeName) || tournament.course.tees?.[0];

  // All hooks must be called at the top level, before any conditional returns
  const group = playerInfo ? tournament.groups[playerInfo.groupIdx] : null;
  const pl = useMemo(() => {
    if (!group || !teeData) return [];
    return group.players.map(p => enrichPlayer(p, teeData));
  }, [group, teeData]);
  const n = pl.map(p => p.name.split(" ")[0]);

  const [hole, setHole] = useState(() => {
    if (!pl || !pl.length) return 0;
    for (let h = 0; h < 18; h++) {
      if (!pl.every(p => p.scores[h] != null)) return h;
    }
    return 17;
  });
  const [view, setView] = useState("hole");
  const prevHole = useRef(hole);

  // Group games state
  const groupGames = useMemo(() => group?.games || [], [group?.games]);

  // Calculate group results (needed by both HV and BV)
  const has4 = pl.length === 4;
  const { results, settlements, balances } = useMemo(() =>
    has4 && groupGames.length > 0
      ? calcAll(groupGames, pl)
      : { results: [], settlements: [], balances: [0, 0, 0, 0] },
    [groupGames, pl, has4]
  );

  const [editing, setEditing] = useState(false);
  const [editGames, setEditGames] = useState(groupGames);
  const [showAddGame, setShowAddGame] = useState(false);
  const [expGame, setExpGame] = useState(null);

  // Auto-advance hole
  const currentHoleScores = pl.map(p => p.scores[hole]).join(",");
  useEffect(() => {
    if (!pl.length) return;
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

  const renderMatchPlayCards = () => {
    const isRC = tournament.format === 'rydercup' && tournament.teamConfig;
    if (!isRC || !playerInfo) return null;

    const standings = calcRyderCupStandings(tournament);
    const teams = tournament.teamConfig.teams;
    const myMatch = tournament.teamConfig.matches.find(m => m.groupIdx === playerInfo.groupIdx);
    const myResult = myMatch ? calcMatchPlay(pl, myMatch.type) : null;

    return (
      <div>
        <div className="cd" style={{ textAlign: 'center' }}>
          <div className="fxb" style={{ justifyContent: 'center', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: teams[0].color }}>{teams[0].name}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: teams[0].color }}>{standings.team1Points}</div>
            </div>
            <div style={{ fontSize: 14, color: T.dim, alignSelf: 'center' }}>vs</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: teams[1].color }}>{teams[1].name}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: teams[1].color }}>{standings.team2Points}</div>
            </div>
          </div>
        </div>

        {myResult && (
          <div className="cd">
            <div className="ct">This Match ({myMatch.type === 'bestball' ? 'Best Ball' : 'Singles'})</div>
            <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, color: myResult.statusTeam === 1 ? teams[0].color : myResult.statusTeam === 2 ? teams[1].color : T.accB }}>
              {myResult.statusText}
            </div>
            {myResult.statusTeam > 0 && <div style={{ fontSize: 13, color: T.dim, textAlign: 'center', marginTop: 4 }}>
              {myResult.statusTeam === 1 ? teams[0].name : teams[1].name}
            </div>}
            <div style={{ fontSize: 12, color: T.dim, textAlign: 'center', marginTop: 4 }}>
              {myResult.played} holes played{myResult.remaining > 0 ? `, ${myResult.remaining} remaining` : ''}
              {myResult.finished && myResult.played < 18 ? ' (match decided)' : ''}
            </div>
          </div>
        )}
      </div>
    );
  };

  const HV = () => {
    const isRC = tournament.format === 'rydercup' && tournament.teamConfig;

    const lb = pl.map((p, i) => {
      const played = p.scores.filter(s => s != null).length;
      const gross = p.scores.filter(s => s != null).reduce((a, b) => a + b, 0);
      const parPlayed = p.teeData.pars.filter((_, hi) => p.scores[hi] != null).reduce((a, b) => a + b, 0);
      const toPar = gross - parPlayed;

      // Determine team for Ryder Cup
      let teamIdx = null;
      if (isRC) {
        if (tournament.teamConfig.teams[0].playerIds.includes(p.id)) teamIdx = 0;
        else if (tournament.teamConfig.teams[1].playerIds.includes(p.id)) teamIdx = 1;
      }

      return { i, gross, toPar, played, name: n[i], teamIdx };
    }).sort((a, b) => a.gross - b.gross);

    return (
      <div>
        {renderMatchPlayCards()}
        {tournament.format === 'rydercup' && tournament.teamConfig && (
          <div className="dvd" style={{ margin: '12px 0' }} />
        )}
        <div style={{ fontSize: 13, color: T.accB, textAlign: 'center', marginBottom: 8 }}>Group {playerInfo.groupIdx + 1}</div>
        <div className="tk"><div className="tkt">Leaderboard</div>
          {lb.map((x, ri) => {
            // Use team color for Ryder Cup, player color otherwise
            const nameColor = x.teamIdx !== null
              ? tournament.teamConfig.teams[x.teamIdx].color
              : null;

            return (
              <div key={x.i} className="tkr">
                <div className="fx g6">
                  <span style={{ fontSize: 12, color: T.mut, width: 16 }}>{ri + 1}.</span>
                  <span className={nameColor ? '' : `pc${x.i}`} style={{ fontWeight: 600, fontSize: 14, color: nameColor || undefined }}>{x.name}</span>
                </div>
                <div className="fx g8">
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{x.gross || "--"}</span>
                  <span style={{ fontSize: 13, color: x.toPar < 0 ? T.accB : x.toPar > 0 ? T.red : T.dim, fontWeight: 600 }}>{x.played > 0 ? (x.toPar > 0 ? "+" : "") + x.toPar : "--"}</span>
                  <span style={{ fontSize: 13, color: T.dim, minWidth: 36, textAlign: "right" }}>{x.played > 0 ? `${x.played}h` : ""}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Bets */}
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
                {r.holeResults && r.holeResults[0] && r.holeResults[0].w !== undefined && (() => {
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
            <div style={{ fontSize: 13, color: T.dim }}>Par {teeData.pars[hole]}</div>
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
                  <span className={`pc${pi}`} style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</span>
                  {str > 0 && <span className="tag ty">{str > 1 ? str + "x" : "1 str"}</span>}
                </div>
                <div className="fx g6" style={{ alignItems: 'center' }}>
                  {sc != null && str > 0 && <span style={{ fontSize: 13, color: T.gold, fontWeight: 600 }}>Net: {sc - str}</span>}
                  <span style={{ fontSize: 12, color: T.dim }}>Par {par} | HCP {p.teeData.handicaps[hole]}</span>
                </div>
              </div>
              <div className="snr">
                {range.map(v => (
                  <button key={v} className={`snb${v === par ? " par" : ""}${sc === v ? " sel " + scoreClass(v, par) : ""}`} onClick={() => onUpdateScore(playerInfo.groupIdx, pi, hole, v)}>{v}</button>
                ))}
                <button className={`snb more${sc != null && sc > hi ? " sel " + scoreClass(sc, par) : ""}`} onClick={() => onUpdateScore(playerInfo.groupIdx, pi, hole, sc != null && sc >= hi + 1 ? sc + 1 : hi + 1)}>{sc != null && sc > hi ? sc : `${hi + 1}+`}</button>
                <button className="snx" onClick={() => onUpdateScore(playerInfo.groupIdx, pi, hole, null)} style={{ visibility: sc != null ? "visible" : "hidden" }}>x</button>
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
  const has2 = pl.length >= 2;

  const startEdit = () => { setEditGames(groupGames.length > 0 ? [...groupGames] : []); setEditing(true); };
  const saveGroupGames = () => { onUpdateGroupGames(playerInfo.groupIdx, editGames); setEditing(false); };
  const addGame = t => {
    const g = { type: t, id: Date.now() };
    if (t === GT.STROKE) Object.assign(g, { net: true, wagerFront: 5, wagerBack: 5, wagerOverall: 10 });
    else if (t === GT.MATCH) {
      if (pl.length === 2) Object.assign(g, { matchups: [[0, 1]], wagerFront: 5, wagerBack: 5, wagerOverall: 10 });
      else Object.assign(g, { team1: [0, 1], team2: [2, 3], wagerFront: 5, wagerBack: 5, wagerOverall: 10 });
    }
    else if (t === GT.SKINS) Object.assign(g, { net: true, carryOver: false, potPerPlayer: 20 });
    else if (t === GT.SIXES) Object.assign(g, { mode: "match", wagerPerSegment: 5, pairs: sixPairs() });
    else if (t === GT.VEGAS) Object.assign(g, { team1: [0, 1], team2: [2, 3], wagerPerPoint: 1 });
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
              <button className="btn bs" disabled={!has2} onClick={() => has2 && addGame(GT.MATCH)}>Match</button>
              <button className="btn bs" disabled={!has4} onClick={() => has4 && addGame(GT.SIXES)}>6-6-6</button>
              <button className="btn bs" disabled={!has4} onClick={() => has4 && addGame(GT.VEGAS)}>Vegas</button>
            </div>{!has4 && <p style={{ fontSize: 12, color: T.dim, marginTop: 6 }}>6-6-6 and Vegas need 4 players</p>}</div>}
            {editGames.map(g => (
              <div key={g.id} className="cd">
                <div className="fxb mb6">
                  <span className="ct" style={{ marginBottom: 0 }}>{g.type === GT.STROKE ? "Stroke" : g.type === GT.MATCH ? "Match" : g.type === GT.SKINS ? "Skins" : g.type === GT.SIXES ? "6-6-6" : "Vegas"}</span>
                  <button style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 13 }} onClick={() => setEditGames(editGames.filter(x => x.id !== g.id))}>Remove</button>
                </div>
                {g.type === GT.STROKE && <>
                  {has4 && <>
                    <div className="il mb6">Format</div>
                    <div className="fx g6 mb10">
                      <button className={`chip ${!g.team1 ? "sel" : ""}`} onClick={() => { const { team1: _team1, team2: _team2, ...rest } = g; setEditGames(editGames.map(x => x.id === g.id ? rest : x)); }}>Individual</button>
                      <button className={`chip ${g.team1 ? "sel" : ""}`} onClick={() => ug(g.id, { team1: g.team1 || [0, 1], team2: g.team2 || [2, 3] })}>2v2 Teams</button>
                    </div>
                  </>}
                  <Tog label="Net" v={g.net} onChange={v => ug(g.id, { net: v })} />
                  {g.team1 && has4 && <>
                    <div className="fx g6 mb8" style={{ justifyContent: "center" }}>
                      <div style={{ flex: 1, textAlign: "center", padding: 8, borderRadius: 10, background: T.accD + "22", fontSize: 14, fontWeight: 600 }}><span className={`pc${g.team1[0]}`}>{n[g.team1[0]]}</span> & <span className={`pc${g.team1[1]}`}>{n[g.team1[1]]}</span></div>
                      <span style={{ color: T.dim, fontWeight: 700, fontSize: 13 }}>vs</span>
                      <div style={{ flex: 1, textAlign: "center", padding: 8, borderRadius: 10, background: T.red + "15", fontSize: 14, fontWeight: 600 }}><span className={`pc${g.team2[0]}`}>{n[g.team2[0]]}</span> & <span className={`pc${g.team2[1]}`}>{n[g.team2[1]]}</span></div>
                    </div>
                    <button className="btn bg mb10" style={{ width: "100%" }} onClick={() => {
                      const c = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]];
                      const cur = c.findIndex(x => x[0] === g.team1[0] && x[1] === g.team1[1]);
                      const nx = c[(cur + 1) % 3];
                      ug(g.id, { team1: [nx[0], nx[1]], team2: [nx[2], nx[3]] });
                    }}>Swap Teams</button>
                  </>}
                  <div className="g3">{[["Front", "wagerFront"], ["Back", "wagerBack"], ["Overall", "wagerOverall"]].map(([l, k]) =>
                    <div key={k}><div className="il">{l} $</div><input className="inp ism" style={{ width: "100%" }} type="number" value={g[k]} onChange={e => ug(g.id, { [k]: parseFloat(e.target.value) || 0 })} /></div>
                  )}</div>
                </>}
                {g.type === GT.MATCH && <>
                  <div className="il mb6">Format</div>
                  <div className="fx g6 mb10">
                    <button className={`chip ${g.matchups ? "sel" : ""}`} onClick={() => { const { team1: _team1, team2: _team2, ...rest } = g; setEditGames(editGames.map(x => x.id === g.id ? { ...rest, matchups: g.matchups || [[0, 1], [2, 3]] } : x)); }}>Individual</button>
                    <button className={`chip ${!g.matchups ? "sel" : ""}`} onClick={() => { const { matchups: _matchups, ...rest } = g; setEditGames(editGames.map(x => x.id === g.id ? { ...rest, team1: g.team1 || [0, 1], team2: g.team2 || [2, 3] } : x)); }}>2v2 Best Ball</button>
                  </div>
                  {g.matchups ? <>
                    {g.matchups.map(([a, b], mi) => (
                      <div key={mi} className="fx g6 mb6" style={{ justifyContent: "center" }}>
                        <span className={`pc${a}`} style={{ fontWeight: 600, fontSize: 14 }}>{n[a]}</span>
                        <span style={{ color: T.dim, fontWeight: 700, fontSize: 13 }}>vs</span>
                        <span className={`pc${b}`} style={{ fontWeight: 600, fontSize: 14 }}>{n[b]}</span>
                      </div>
                    ))}
                    <button className="btn bg mb10" style={{ width: "100%" }} onClick={() => {
                      const c = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
                      const cur = c.findIndex(x => x[0][0] === g.matchups[0][0] && x[0][1] === g.matchups[0][1]);
                      const nx = c[(cur + 1) % 3];
                      ug(g.id, { matchups: nx });
                    }}>Swap Matchups</button>
                  </> : <>
                    <div className="fx g6 mb8" style={{ justifyContent: "center" }}>
                      <div style={{ flex: 1, textAlign: "center", padding: 8, borderRadius: 10, background: T.accD + "22", fontSize: 14, fontWeight: 600 }}><span className={`pc${g.team1[0]}`}>{n[g.team1[0]]}</span> & <span className={`pc${g.team1[1]}`}>{n[g.team1[1]]}</span></div>
                      <span style={{ color: T.dim, fontWeight: 700, fontSize: 13 }}>vs</span>
                      <div style={{ flex: 1, textAlign: "center", padding: 8, borderRadius: 10, background: T.red + "15", fontSize: 14, fontWeight: 600 }}><span className={`pc${g.team2[0]}`}>{n[g.team2[0]]}</span> & <span className={`pc${g.team2[1]}`}>{n[g.team2[1]]}</span></div>
                    </div>
                    <button className="btn bg mb10" style={{ width: "100%" }} onClick={() => {
                      const c = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]];
                      const cur = c.findIndex(x => x[0] === g.team1[0] && x[1] === g.team1[1]);
                      const nx = c[(cur + 1) % 3];
                      ug(g.id, { team1: [nx[0], nx[1]], team2: [nx[2], nx[3]] });
                    }}>Swap Teams</button>
                  </>}
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
                {g.type === GT.VEGAS && <>
                  <div className="fx g6 mb8" style={{ justifyContent: "center" }}>
                    <div style={{ flex: 1, textAlign: "center", padding: 8, borderRadius: 10, background: T.accD + "22", fontSize: 14, fontWeight: 600 }}><span className={`pc${g.team1[0]}`}>{n[g.team1[0]]}</span> & <span className={`pc${g.team1[1]}`}>{n[g.team1[1]]}</span></div>
                    <span style={{ color: T.dim, fontWeight: 700, fontSize: 13 }}>vs</span>
                    <div style={{ flex: 1, textAlign: "center", padding: 8, borderRadius: 10, background: T.red + "15", fontSize: 14, fontWeight: 600 }}><span className={`pc${g.team2[0]}`}>{n[g.team2[0]]}</span> & <span className={`pc${g.team2[1]}`}>{n[g.team2[1]]}</span></div>
                  </div>
                  <button className="btn bg mb10" style={{ width: "100%" }} onClick={() => {
                    const c = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]];
                    const cur = c.findIndex(x => x[0] === g.team1[0] && x[1] === g.team1[1]);
                    const nx = c[(cur + 1) % 3];
                    ug(g.id, { team1: [nx[0], nx[1]], team2: [nx[2], nx[3]] });
                  }}>Swap Teams</button>
                  <div><div className="il">$/point</div><input className="inp" type="number" step="0.05" value={g.wagerPerPoint} onChange={e => ug(g.id, { wagerPerPoint: parseFloat(e.target.value) || 0 })} /></div>
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

      // Show results if group has games (results calculated at component level)
      if (groupGames.length > 0 && has4) {
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
                    <div className="fxb mb6"><span className="ct" style={{ marginBottom: 0 }}>{r.title}</span>{r.wager && <span className="tag ty">{r.wager.replace('/pl', '/player').replace('/seg', '/segment')}</span>}</div>
                    {r.segmentScores.map((seg, si) => {
                      const currentHole = (() => { for (let h = 0; h < 18; h++) { if (!pl.every(p => p.scores[h] != null)) return h; } return 17; })();
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
                  <div className="fxb mb6"><span className="ct" style={{ marginBottom: 0 }}>{r.title}</span>{r.wager && <span className="tag ty">{r.wager}</span>}</div>
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

    // Section 3: Ryder Cup match play status
    const matchPlaySection = renderMatchPlayCards();

    return (
      <div>
        {matchPlaySection}
        {matchPlaySection && (skinsSection || groupSection) && <div className="dvd" style={{ margin: '12px 0' }} />}
        {skinsSection}
        {skinsSection && groupSection && <div className="dvd" style={{ margin: '12px 0' }} />}
        {groupSection}
      </div>
    );
  };

  const isRC = tournament.format === 'rydercup' && tournament.teamConfig;
  const showBets = skinsConfig || groupGames.length > 0 || has4 || isRC;

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
