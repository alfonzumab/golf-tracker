import { useState } from 'react';
import { T, GT, PC } from '../theme';
import { sixPairs } from '../utils/golf';
import Tog from './Toggle';

const Setup = ({ rp, course, onConfirm }) => {
  const [games, setGames] = useState([]);
  const [sa, setSa] = useState(true);
  const n = rp.map(p => p.name.split(" ")[0]);

  const add = t => {
    const g = { type: t, id: Date.now() };
    if (t === GT.STROKE) Object.assign(g, { net: true, wagerFront: 5, wagerBack: 5, wagerOverall: 10 });
    else if (t === GT.MATCH) Object.assign(g, { team1: [0, 1], team2: [2, 3], wagerFront: 5, wagerBack: 5, wagerOverall: 10 });
    else if (t === GT.SKINS) Object.assign(g, { net: true, carryOver: false, potPerPlayer: 20 });
    else Object.assign(g, { mode: "match", wagerPerSegment: 5, pairs: sixPairs() });
    setGames([...games, g]); setSa(false);
  };
  const u = (id, up) => setGames(games.map(g => g.id === id ? { ...g, ...up } : g));

  return (
    <div className="pg">
      <div className="cd">
        <div className="ct">Foursome</div>
        <div style={{ fontSize: 13, color: T.dim, marginBottom: 8 }}>{course.name}</div>
        {rp.map((p, i) => (
          <div key={p.id} className="fxb" style={{ padding: "6px 0" }}>
            <div className="fx g6"><span className={`pc${i}`} style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span><span className="tag tg">{p.tee}</span></div>
            <span style={{ fontSize: 13, color: T.dim }}>Idx {p.index} {">"} CH {p.courseHandicap}</span>
          </div>
        ))}
        <div className="dvd" />
        <div className="il mb6">Stroke Allocation</div>
        <div className="sw"><table className="sct"><thead><tr><th style={{ minWidth: 44, textAlign: "left", paddingLeft: 4 }}>Hole</th>
          {Array.from({ length: 18 }, (_, i) => <th key={i} className="hn">{i + 1}</th>)}</tr></thead><tbody>
          <tr style={{ color: T.mut, fontSize: 11 }}><td style={{ textAlign: "left", paddingLeft: 4, fontSize: 11 }}>HCP</td>{rp[0].teeData.handicaps.map((h, i) => <td key={i}>{h}</td>)}</tr>
          {rp.map((p, pi) => <tr key={pi}><td style={{ textAlign: "left", paddingLeft: 4 }}><span className={`pc${pi}`} style={{ fontWeight: 600, fontSize: 12 }}>{n[pi]}</span></td>
            {p.strokeHoles.map((s, i) => <td key={i} style={{ color: s > 0 ? T.gold : T.mut, fontWeight: s > 0 ? 700 : 400, fontSize: 12 }}>{s > 0 ? (s > 1 ? s : "*") : "|"}</td>)}</tr>)}
        </tbody></table></div>
      </div>

      <div className="fxb mb10">
        <span className="pg-title">Games</span>
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
            <div style={{ fontSize: 13, color: T.dim }}>{(g.pairs || []).map((p, i) => <div key={i} style={{ padding: "2px 0" }}>{p.l}: {n[p.t1[0]]}&{n[p.t1[1]]} vs {n[p.t2[0]]}&{n[p.t2[1]]}</div>)}</div>
          </>}
        </div>
      ))}
      {games.length > 0 && <button className="btn bp" style={{ fontSize: 16, padding: 16 }} onClick={() => onConfirm(games)}>Start Round {">"}</button>}
    </div>
  );
};

export default Setup;
