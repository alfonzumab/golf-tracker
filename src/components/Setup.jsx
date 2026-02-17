import { useState } from 'react';
import { T, GT } from '../theme';
import { sixPairs, calcCH, getStrokes } from '../utils/golf';
import Tog from './Toggle';

const Setup = ({ rp, course, onConfirm }) => {
  const [games, setGames] = useState([]);
  const [sa, setSa] = useState(true);
  const [players, setPlayers] = useState(rp);
  const n = players.map(p => p.name.split(" ")[0]);
  const is3 = players.length === 3;

  const add = t => {
    const g = { type: t, id: Date.now() };
    if (t === GT.STROKE) Object.assign(g, { net: true, wagerFront: 5, wagerBack: 5, wagerOverall: 10 });
    else if (t === GT.MATCH) Object.assign(g, { team1: [0, 1], team2: [2, 3], wagerFront: 5, wagerBack: 5, wagerOverall: 10 });
    else if (t === GT.SKINS) Object.assign(g, { net: true, carryOver: false, skinsMode: "pot", potPerPlayer: 20 });
    else if (t === GT.SIXES) Object.assign(g, { mode: "match", wagerPerSegment: 5, pairs: sixPairs() });
    else if (t === GT.VEGAS) Object.assign(g, { team1: [0, 1], team2: [2, 3], wagerPerPoint: 1, flipOnBirdie: true });
    else if (t === GT.NINES) Object.assign(g, { net: true, wagerPerPoint: 1 });
    setGames([...games, g]); setSa(false);
  };
  const u = (id, up) => setGames(games.map(g => g.id === id ? { ...g, ...up } : g));

  const updatePlayerTee = (playerId, newTeeName) => {
    const tee = course.tees.find(t => t.name === newTeeName) || course.tees[0];
    const tp = tee.pars.reduce((a, b) => a + b, 0);
    const ch = calcCH(players.find(p => p.id === playerId).index, tee.slope, tee.rating, tp);
    setPlayers(players.map(p =>
      p.id === playerId
        ? { ...p, tee: newTeeName, teeData: tee, courseHandicap: ch, strokeHoles: getStrokes(ch, tee.handicaps) }
        : p
    ));
  };

  return (
    <div className="pg">
      <div className="cd">
        <div className="ct">{is3 ? "Threesome" : "Foursome"}</div>
        <div style={{ fontSize: 13, color: T.dim, marginBottom: 12 }}>{course.name}</div>

        {/* Player Grid - 2 columns for better space usage */}
        <div className="g2 force-2" style={{ gap: "8px", marginBottom: 12 }}>
          {players.map((p, i) => (
            <div key={p.id} className="cd" style={{ padding: "12px", margin: 0, background: T.bg2 }}>
              <div className="fxb" style={{ marginBottom: 8 }}>
                <span className={`pc${i}`} style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                <select
                  className="inp ism"
                  style={{ fontSize: "11px", width: "80px", padding: "2px 6px" }}
                  value={p.tee}
                  onChange={e => updatePlayerTee(p.id, e.target.value)}
                >
                  {course.tees.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ fontSize: 12, color: T.dim }}>
                Index: {p.index} → Course HCP: {p.courseHandicap}
              </div>
            </div>
          ))}
        </div>
        <div className="dvd" />
        <div className="il mb6">Stroke Allocation</div>
        <div className="sw" style={{ marginBottom: 16 }}>
          {/* Compact stroke allocation display */}
          <div style={{ display: 'grid', gap: '8px' }}>
            {players.map((p, pi) => (
              <div key={pi} className="fxb" style={{ padding: '8px', background: T.bg2, borderRadius: '8px' }}>
                <span className={`pc${pi}`} style={{ fontWeight: 600, fontSize: 13, minWidth: '60px' }}>{n[pi]}</span>
                <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                  {p.strokeHoles.map((s, i) => (
                    <span key={i} style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '2px',
                      background: s > 0 ? T.gold : 'transparent',
                      border: `1px solid ${s > 0 ? T.gold : T.mut}`,
                      color: s > 0 ? '#000' : T.mut,
                      fontSize: '10px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {s > 1 ? s : s > 0 ? '*' : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fxb mb10">
        <span className="pg-title">Games</span>
        <button className="btn bp bsm" onClick={() => setSa(true)}>+ Add</button>
      </div>

      {sa && <div className="cd"><div className="g2">
        <button className="btn bs" onClick={() => add(GT.STROKE)}>Stroke</button>
        {!is3 && <button className="btn bs" onClick={() => add(GT.MATCH)}>Match</button>}
        <button className="btn bs" onClick={() => add(GT.SKINS)}>Skins</button>
        {!is3 && <button className="btn bs" onClick={() => add(GT.SIXES)}>6-6-6</button>}
        {!is3 && <button className="btn bs" onClick={() => add(GT.VEGAS)}>Vegas</button>}
        {is3 && <button className="btn bs" onClick={() => add(GT.NINES)}>9s</button>}
      </div></div>}

      {games.map(g => (
        <div key={g.id} className="cd">
          <div className="fxb mb6">
            <span className="ct" style={{ marginBottom: 0 }}>{g.type === GT.STROKE ? "Stroke" : g.type === GT.MATCH ? "Match" : g.type === GT.SKINS ? "Skins" : g.type === GT.SIXES ? "6-6-6" : g.type === GT.NINES ? "9s" : "Vegas"}</span>
            <button className="bg" style={{ color: T.red, borderColor: T.red + "33" }} onClick={() => setGames(games.filter(x => x.id !== g.id))}>Remove</button>
          </div>
          {g.type === GT.STROKE && <>
            <div className="il mb6">Format</div>
            <div className="fx g6 mb10">
              <button className={`chip ${!g.team1 ? "sel" : ""}`} onClick={() => { const { team1: _team1, team2: _team2, ...rest } = g; setGames(games.map(x => x.id === g.id ? rest : x)); }}>Individual</button>
              <button className={`chip ${g.team1 ? "sel" : ""}`} onClick={() => u(g.id, { team1: g.team1 || [0, 1], team2: g.team2 || [2, 3] })}>2v2 Teams</button>
            </div>
            <Tog label="Net" v={g.net} onChange={v => u(g.id, { net: v })} />
            {g.team1 && <>
              <div className="fx g6 mb8" style={{ justifyContent: "center" }}>
                <div style={{ flex: 1, textAlign: "center", padding: 8, borderRadius: 10, background: T.accD + "22", fontSize: 14, fontWeight: 600 }}><span className={`pc${g.team1[0]}`}>{n[g.team1[0]]}</span> & <span className={`pc${g.team1[1]}`}>{n[g.team1[1]]}</span></div>
                <span style={{ color: T.dim, fontWeight: 700, fontSize: 13 }}>vs</span>
                <div style={{ flex: 1, textAlign: "center", padding: 8, borderRadius: 10, background: T.red + "15", fontSize: 14, fontWeight: 600 }}><span className={`pc${g.team2[0]}`}>{n[g.team2[0]]}</span> & <span className={`pc${g.team2[1]}`}>{n[g.team2[1]]}</span></div>
              </div>
              <button className="btn bg mb10" style={{ width: "100%" }} onClick={() => {
                const c = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]];
                const cur = c.findIndex(x => x[0] === g.team1[0] && x[1] === g.team1[1]);
                const nx = c[(cur + 1) % 3];
                u(g.id, { team1: [nx[0], nx[1]], team2: [nx[2], nx[3]] });
              }}>Swap Teams</button>
            </>}
            <div className="g3">{[["Front", "wagerFront"], ["Back", "wagerBack"], ["Overall", "wagerOverall"]].map(([l, k]) =>
              <div key={k}><div className="il">{l} $</div><input className="inp ism" style={{ width: "100%" }} type="number" value={g[k]} onChange={e => u(g.id, { [k]: parseFloat(e.target.value) || 0 })} /></div>
            )}</div>
          </>}
          {g.type === GT.MATCH && <>
            <div className="il mb6">Format</div>
            <div className="fx g6 mb10">
              <button className={`chip ${g.matchups ? "sel" : ""}`} onClick={() => { const { team1: _team1, team2: _team2, ...rest } = g; setGames(games.map(x => x.id === g.id ? { ...rest, matchups: g.matchups || [[0, 1], [2, 3]] } : x)); }}>Individual</button>
              <button className={`chip ${!g.matchups ? "sel" : ""}`} onClick={() => { const { matchups: _matchups, ...rest } = g; setGames(games.map(x => x.id === g.id ? { ...rest, team1: g.team1 || [0, 1], team2: g.team2 || [2, 3] } : x)); }}>2v2 Best Ball</button>
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
                u(g.id, { matchups: nx });
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
                u(g.id, { team1: [nx[0], nx[1]], team2: [nx[2], nx[3]] });
              }}>Swap Teams</button>
            </>}
            <div className="g3">{[["Front", "wagerFront"], ["Back", "wagerBack"], ["Overall", "wagerOverall"]].map(([l, k]) =>
              <div key={k}><div className="il">{l} $</div><input className="inp ism" style={{ width: "100%" }} type="number" value={g[k]} onChange={e => u(g.id, { [k]: parseFloat(e.target.value) || 0 })} /></div>
            )}</div>
          </>}
          {g.type === GT.SKINS && <>
            <div className="il mb6">Payment Mode</div>
            <div className="fx g6 mb10">
              <button className={`chip ${!g.skinsMode || g.skinsMode === "pot" ? "sel" : ""}`} onClick={() => u(g.id, { skinsMode: "pot" })}>Pot</button>
              <button className={`chip ${g.skinsMode === "perSkin" ? "sel" : ""}`} onClick={() => u(g.id, { skinsMode: "perSkin" })}>Per Skin</button>
            </div>
            <Tog label="Net" v={g.net} onChange={v => u(g.id, { net: v })} />
            <Tog label="Carry-over" v={g.carryOver} onChange={v => u(g.id, { carryOver: v })} />
            <div><div className="il">{g.skinsMode === "perSkin" ? "$/skin" : "Pot $/player"}</div><input className="inp" type="number" value={g.skinsMode === "perSkin" ? (g.amountPerSkin || 5) : (g.potPerPlayer || 20)} onChange={e => u(g.id, { [g.skinsMode === "perSkin" ? "amountPerSkin" : "potPerPlayer"]: parseFloat(e.target.value) || 0 })} /></div>
            <div style={{ fontSize: 12, color: T.dim, marginTop: 8 }}>
              {g.skinsMode === "perSkin" 
                ? `Example: With 6 skins, a player could lose up to $${((g.amountPerSkin || 5) * 6).toFixed(0)} (${g.amountPerSkin || 5}/skin × 6 skins)`
                : `Example: ${players.length} players × $${g.potPerPlayer || 20} = $${(players.length * (g.potPerPlayer || 20)).toFixed(0)} pot. If 5 skins won: $${((players.length * (g.potPerPlayer || 20)) / 5).toFixed(0)}/skin`
              }
            </div>
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
            <div style={{ fontSize: 13, color: T.dim }}>{(g.pairs || []).map((p, i) => <div key={i} style={{ padding: "2px 0" }}>{p.l}: {n[p.t1[0]]}&{n[p.t1[1]]} vs {n[p.t2[0]]}&{n[p.t2[1]]}</div>)}</div>
          </>}
          {g.type === GT.NINES && <>
            <Tog label="Net" v={g.net} onChange={v => u(g.id, { net: v })} />
            <div><div className="il">$/point</div><input className="inp" type="number" step="0.25" value={g.wagerPerPoint} onChange={e => u(g.id, { wagerPerPoint: parseFloat(e.target.value) || 0 })} /></div>
            <div style={{ fontSize: 12, color: T.dim, marginTop: 8 }}>9 points per hole split by score (5/3/1, 4/4/1, 5/2/2, or 3/3/3). Settlement based on point differential × $/point.</div>
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
              u(g.id, { team1: [nx[0], nx[1]], team2: [nx[2], nx[3]] });
            }}>Swap Teams</button>
            <div className="mb10"><div className="il">$/point (per team)</div><input className="inp" type="number" step="0.05" value={g.wagerPerPoint} onChange={e => u(g.id, { wagerPerPoint: parseFloat(e.target.value) || 0 })} /></div>
            <Tog label="Flip on Birdie" v={g.flipOnBirdie} onChange={v => u(g.id, { flipOnBirdie: v })} />
            <div style={{ fontSize: 12, color: T.dim, marginTop: 8 }}>When a player makes birdie or better, the opposing team's number is reversed.</div>
          </>}
        </div>
      ))}
      {games.length > 0 && <button className="btn bp" style={{ fontSize: 16, padding: 16 }} onClick={() => onConfirm(games, players)}>Start Round {">"}</button>}
    </div>
  );
};

export default Setup;
