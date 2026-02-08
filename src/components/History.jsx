import { useState } from 'react';
import { T, PC } from '../theme';
import { calcAll } from '../utils/calc';
import { fmt$, enrichPlayer } from '../utils/golf';

const Hist = ({ rounds, tournamentHistory, onLoad, onReopenRound, onReopenTournament, isHost, onViewTournament }) => {
  const [tab, setTab] = useState('rounds');
  const [det, setDet] = useState(null);

  // Share round results
  const shareRound = (r) => {
    const n = r.players.map(p => p.name.split(" ")[0]);
    const { balances, results } = calcAll(r.games, r.players);
    const hc = r.players.map(p => p.scores.filter(s => s != null).length);
    const minHoles = Math.min(...hc);

    let text = `${r.course.name} - ${r.date}\n\n`;
    text += `Scores:\n`;
    r.players.forEach((p, i) => {
      const gr = p.scores.filter(s => s != null).reduce((a, b) => a + b, 0);
      text += `${p.name}: ${gr} (CH ${p.courseHandicap})\n`;
    });
    text += `\nFinal P&L:\n`;
    r.players.forEach((_, i) => {
      const v = -balances[i];
      text += `${n[i]}: ${fmt$(v)}\n`;
    });

    if (navigator.share) {
      navigator.share({ title: 'Round Results', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Results copied to clipboard!');
    }
  };

  // Share tournament results
  const shareTournament = (t) => {
    let text = `${t.name} - ${t.date}\n${t.course.name}\n\n`;

    // Build leaderboard
    const allPlayers = [];
    t.groups.forEach((g, gi) => {
      g.players.forEach((p, pi) => {
        const enriched = enrichPlayer(p, t.course.tees.find(te => te.name === t.teeName));
        const scores = enriched.scores.filter(s => s != null);
        const gross = scores.reduce((a, b) => a + b, 0);
        const pars = t.course.tees.find(te => te.name === t.teeName).pars;
        const holesPlayed = scores.length;
        const par = pars.slice(0, holesPlayed).reduce((a, b) => a + b, 0);
        const toPar = gross - par;
        allPlayers.push({ name: p.name, gross, toPar, holesPlayed });
      });
    });

    // Sort by to-par ascending
    allPlayers.sort((a, b) => a.toPar - b.toPar);

    text += 'Leaderboard:\n';
    allPlayers.forEach((p, i) => {
      const sign = p.toPar > 0 ? '+' : '';
      text += `${i + 1}. ${p.name}: ${sign}${p.toPar}\n`;
    });

    if (navigator.share) {
      navigator.share({ title: 'Tournament Results', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Results copied to clipboard!');
    }
  };

  // Round detail view
  if (det && tab === 'rounds') {
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
        <div className="fx g10 mt10">
          <button className="btn bs" style={{ flex: 1 }} onClick={() => shareRound(det)}>Share Results</button>
          <button className="btn bs" style={{ flex: 1 }} onClick={() => onReopenRound(det)}>Reopen Round</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pg">
      <div className="pg-title" style={{ marginBottom: 12 }}>History</div>

      {/* Tab bar */}
      <div className="tabs mb10">
        <button className={`tab ${tab === 'rounds' ? 'on' : ''}`} onClick={() => setTab('rounds')}>Rounds</button>
        <button className={`tab ${tab === 'tournaments' ? 'on' : ''}`} onClick={() => setTab('tournaments')}>Tournaments</button>
      </div>

      {/* Rounds tab */}
      {tab === 'rounds' && (
        <>
          {!rounds.length ? (
            <div className="empty">
              <div className="empty-i">{"\uD83D\uDCCA"}</div>
              <div className="empty-t">No rounds yet</div>
              <div style={{ fontSize: 14, color: T.dim, marginTop: 8 }}>Completed rounds will appear here</div>
            </div>
          ) : (
            [...rounds].reverse().map((r, i) => {
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
            })
          )}
        </>
      )}

      {/* Tournaments tab */}
      {tab === 'tournaments' && (
        <>
          {!tournamentHistory.length ? (
            <div className="empty">
              <div className="empty-i">{"\uD83C\uDFC6"}</div>
              <div className="empty-t">No tournaments yet</div>
              <div style={{ fontSize: 14, color: T.dim, marginTop: 8 }}>Finished tournaments will appear here</div>
            </div>
          ) : (
            [...tournamentHistory].reverse().map((t, i) => {
              const totalPlayers = t.groups.reduce((sum, g) => sum + g.players.length, 0);
              const isHostUser = isHost(t);
              return <div key={i} className="cd">
                <div className="fxb mb6">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                      {t.name}
                      {t.format === 'rydercup' && <span className="tag tg" style={{ marginLeft: 6, fontSize: 11 }}>Ryder Cup</span>}
                    </div>
                    <div style={{ fontSize: 13, color: T.dim }}>{t.date}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: T.dim, marginBottom: 8 }}>
                  {t.course.name} • {totalPlayers} player{totalPlayers !== 1 ? 's' : ''} • {t.groups.length} group{t.groups.length !== 1 ? 's' : ''}
                </div>
                <div className="fx g10">
                  <button className="btn bp" style={{ flex: 1 }} onClick={() => onViewTournament(t)}>View</button>
                  <button className="btn bs" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); shareTournament(t); }}>Share</button>
                  {isHostUser && <button className="btn bg" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); onReopenTournament(t); }}>Reopen</button>}
                </div>
              </div>;
            })
          )}
        </>
      )}
    </div>
  );
};

export default Hist;
