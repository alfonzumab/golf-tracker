import { useState } from 'react';
import { T, PC } from '../theme';
import { calcAll } from '../utils/calc';
import { fmt$ } from '../utils/golf';

const Hist = ({ rounds, onLoad }) => {
  const [det, setDet] = useState(null);

  if (det) {
    const r = det, n = r.players.map(p => p.name.split(" ")[0]);
    const { results, settlements, balances } = calcAll(r.games, r.players);
    return (
      <div className="pg">
        <button className="btn bg mb10" onClick={() => setDet(null)}>{"<"} Back</button>
        <div className="cd">
          <div className="ct">{r.course.name}</div>
          <div style={{ fontSize: 13, color: T.dim, marginBottom: 8 }}>{r.date}</div>
          {r.players.map((p, i) => {
            const gr = p.scores.filter(s => s != null).reduce((a, b) => a + b, 0);
            return <div key={i} className="fxb" style={{ padding: "6px 0" }}>
              <div className="fx g6"><span className={`pc${i}`} style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span><span className="tag tg">{p.tee}</span></div>
              <div className="fx g8"><span style={{ fontSize: 22, fontWeight: 700 }}>{gr}</span><span style={{ fontSize: 12, color: T.dim }}>CH {p.courseHandicap}</span></div>
            </div>;
          })}
        </div>
        <div className="cd"><div className="ct">Final P&L</div>
          {r.players.map((_, i) => {
            const v = -balances[i];
            return <div key={i} className={`sr ${v > 0.01 ? "sp" : v < -0.01 ? "sn" : "su"}`}>
              <span className={`pc${i}`} style={{ fontWeight: 700 }}>{n[i]}</span><span style={{ fontWeight: 700 }}>{fmt$(v)}</span></div>;
          })}
        </div>
        {settlements.length > 0 && <div className="cd"><div className="ct">Settlement</div>
          {settlements.map((s, i) => <div key={i} className="sr sn">
            <span style={{ fontSize: 14 }}>{n[s.from]} {">"} {n[s.to]}</span><span>${s.amount.toFixed(2)}</span>
          </div>)}
        </div>}
        {results.map((r, i) => <div key={i} className="cd"><div className="ct">{r.title}</div>
          {r.details?.map((d, j) => <div key={j} style={{ fontSize: 13, color: T.dim, marginBottom: 4 }}>{d}</div>)}
        </div>)}
        <button className="btn bs mt10" onClick={() => onLoad(det)}>Reopen Round</button>
      </div>
    );
  }

  if (!rounds.length) return (
    <div className="pg">
      <div className="empty">
        <div className="empty-i">{"\uD83D\uDCCA"}</div>
        <div className="empty-t">No rounds yet</div>
        <div style={{ fontSize: 14, color: T.dim, marginTop: 8 }}>Completed rounds will appear here</div>
      </div>
    </div>
  );

  return (
    <div className="pg">
      <div className="pg-title" style={{ marginBottom: 12 }}>History</div>
      {[...rounds].reverse().map((r, i) => {
        const { balances } = calcAll(r.games, r.players), n = r.players.map(p => p.name.split(" ")[0]);
        return <div key={i} className="cd" style={{ cursor: "pointer" }} onClick={() => setDet(r)}>
          <div className="fxb mb6"><div><div style={{ fontWeight: 600, fontSize: 15 }}>{r.course.name}</div><div style={{ fontSize: 13, color: T.dim }}>{r.date}</div></div></div>
          <div className="fx fw g6">{r.players.map((p, pi) => {
            const gr = p.scores.filter(s => s != null).reduce((a, b) => a + b, 0), v = -balances[pi];
            return <div key={pi} className="fx g6" style={{ fontSize: 13 }}>
              <span className={`pc${pi}`} style={{ fontWeight: 600 }}>{n[pi]}:{gr}</span>
              <span style={{ color: v > 0.01 ? T.accB : v < -0.01 ? T.red : T.dim, fontWeight: 600, fontSize: 12 }}>({fmt$(v)})</span>
            </div>;
          })}</div>
        </div>;
      })}
    </div>
  );
};

export default Hist;
