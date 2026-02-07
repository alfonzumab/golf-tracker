import { useState } from 'react';
import { T, GT } from '../../theme';
import { sixPairs } from '../../utils/golf';
import Tog from '../Toggle';

const TournamentSetup = ({ courses, players: savedPlayers, selectedCourseId, onComplete }) => {
  const [step, setStep] = useState(1);

  // Step 1: Basics
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [courseId, setCourseId] = useState(selectedCourseId || (courses[0]?.id ?? ''));

  // Step 2: Players
  const [tPlayers, setTPlayers] = useState([]);
  const [newName, setNewName] = useState('');
  const [newIdx, setNewIdx] = useState('');

  // Step 3: Groups
  const [groups, setGroups] = useState([]);

  // Step 4: Games
  const [tGames, setTGames] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  const course = courses.find(c => c.id === courseId) || courses[0];
  const teeName = course?.tees?.[0]?.name || '';

  // Step 1 actions
  const step1Valid = name.trim() && course;

  // Step 2 actions
  const addPlayer = () => {
    if (!newName.trim()) return;
    setTPlayers([...tPlayers, { id: Date.now().toString(), name: newName.trim(), index: parseFloat(newIdx) || 0 }]);
    setNewName('');
    setNewIdx('');
  };

  const addSavedPlayer = (p) => {
    if (tPlayers.find(tp => tp.id === p.id)) return;
    setTPlayers([...tPlayers, { ...p }]);
  };

  const removePlayer = (id) => setTPlayers(tPlayers.filter(p => p.id !== id));

  // Step 3 actions: auto-generate groups of 4
  const autoGroup = () => {
    const ungrouped = [...tPlayers];
    const g = [];
    const groupSize = ungrouped.length >= 8 ? 4 : Math.ceil(ungrouped.length / 2);
    while (ungrouped.length > groupSize) {
      g.push({ players: ungrouped.splice(0, groupSize) });
    }
    if (ungrouped.length > 0) {
      g.push({ players: ungrouped });
    }
    setGroups(g);
  };

  const movePlayer = (fromGroup, playerIdx, toGroup) => {
    const updated = groups.map(g => ({ ...g, players: [...g.players] }));
    const [player] = updated[fromGroup].players.splice(playerIdx, 1);
    updated[toGroup].players.push(player);
    // Remove empty groups
    setGroups(updated.filter(g => g.players.length > 0));
  };

  const addEmptyGroup = () => setGroups([...groups, { players: [] }]);

  const allGrouped = groups.reduce((sum, g) => sum + g.players.length, 0) === tPlayers.length;
  const allValid = groups.length >= 2 && groups.every(g => g.players.length >= 2 && g.players.length <= 4) && allGrouped;

  return (
    <div className="pg">
      {/* Progress */}
      <div className="fx g8 mb12" style={{ justifyContent: 'center' }}>
        {[1, 2, 3, 4].map(s => (
          <div key={s} style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
            background: step >= s ? T.accD + '44' : T.mut + '33',
            color: step >= s ? T.accB : T.dim,
            border: `2px solid ${step === s ? T.acc : 'transparent'}`
          }}>{s}</div>
        ))}
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="cd">
          <div className="t-step">Step 1 of 4</div>
          <div className="t-step-title">Tournament Info</div>
          <div className="mb10">
            <div className="il mb6">Tournament Name</div>
            <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="Saturday Skins Game" />
          </div>
          <div className="mb10">
            <div className="il mb6">Date</div>
            <input className="inp" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="mb10">
            <div className="il mb6">Course</div>
            <select className="inp" value={courseId} onChange={e => setCourseId(e.target.value)}>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.city}</option>)}
            </select>
          </div>
          {course && <div style={{ fontSize: 13, color: T.dim }}>Tee: {teeName}</div>}
          <button className="btn bp mt10" disabled={!step1Valid} onClick={() => setStep(2)}>
            Next: Add Players {">"}
          </button>
        </div>
      )}

      {/* Step 2: Players */}
      {step === 2 && (
        <div>
          <div className="cd">
            <div className="t-step">Step 2 of 4</div>
            <div className="t-step-title">Players ({tPlayers.length})</div>
            <p style={{ fontSize: 13, color: T.dim, marginBottom: 12 }}>
              Add at least 4 players. You can pick from saved players or add new ones.
            </p>

            {/* Add from saved */}
            {savedPlayers.length > 0 && (
              <div className="mb10">
                <div className="il mb6">Quick Add from Saved</div>
                <div className="fx fw g6">
                  {savedPlayers.map(p => {
                    const added = tPlayers.find(tp => tp.id === p.id);
                    return (
                      <button key={p.id} className={`chip ${added ? 'sel' : ''}`}
                        onClick={() => added ? removePlayer(p.id) : addSavedPlayer(p)}
                        style={added ? { opacity: 0.6 } : {}}>
                        {p.name} ({p.index})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="dvd" />

            {/* Add new player */}
            <div className="il mb6">Add New Player</div>
            <div className="fx g6 mb8">
              <input className="inp" style={{ flex: 2 }} value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Player name" onKeyDown={e => e.key === 'Enter' && addPlayer()} />
              <input className="inp ism" style={{ width: 70 }} type="number" value={newIdx}
                onChange={e => setNewIdx(e.target.value)} placeholder="Idx" />
              <button className="btn bp bsm" style={{ flexShrink: 0 }} onClick={addPlayer}>+</button>
            </div>

            {/* Player list */}
            {tPlayers.length > 0 && (
              <div className="mt8">
                {tPlayers.map((p, i) => (
                  <div key={p.id} className="t-player-row">
                    <span style={{ color: T.dim, fontSize: 13, width: 20 }}>{i + 1}</span>
                    <span className="prow-n" style={{ flex: 1 }}>{p.name}</span>
                    <span style={{ fontSize: 13, color: T.dim }}>Idx {p.index}</span>
                    <button style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', padding: 4, fontSize: 16 }}
                      onClick={() => removePlayer(p.id)}>x</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="fx g8">
            <button className="btn bs" style={{ flex: 1 }} onClick={() => setStep(1)}>{"<"} Back</button>
            <button className="btn bp" style={{ flex: 2 }} disabled={tPlayers.length < 4}
              onClick={() => { if (groups.length === 0) autoGroup(); setStep(3); }}>
              Next: Groups {">"}
            </button>
          </div>
          {tPlayers.length > 0 && tPlayers.length < 4 && (
            <p style={{ fontSize: 13, color: T.dim, textAlign: 'center', marginTop: 8 }}>
              Need {4 - tPlayers.length} more player{4 - tPlayers.length !== 1 ? 's' : ''} (minimum 4)
            </p>
          )}
        </div>
      )}

      {/* Step 3: Groups */}
      {step === 3 && (
        <div>
          <div className="cd">
            <div className="t-step">Step 3 of 4</div>
            <div className="t-step-title">Groups</div>
            <p style={{ fontSize: 13, color: T.dim, marginBottom: 12 }}>
              Arrange players into foursomes (2-4 per group). Tap a player to move them.
            </p>
            <div className="fx g8 mb10">
              <button className="btn bg" style={{ flex: 1 }} onClick={autoGroup}>Auto-Group</button>
              <button className="btn bg" style={{ flex: 1 }} onClick={addEmptyGroup}>+ Empty Group</button>
            </div>
          </div>

          {groups.map((g, gi) => (
            <div key={gi} className="t-grp">
              <div className="t-grp-h">Group {gi + 1} ({g.players.length}/4)</div>
              {g.players.map((p, pi) => (
                <div key={p.id} className="fx fxb" style={{ padding: '6px 0' }}>
                  <span style={{ fontSize: 14, color: T.txt }}>{p.name}</span>
                  <div className="fx g6">
                    <span style={{ fontSize: 12, color: T.dim }}>Idx {p.index}</span>
                    {groups.length > 1 && (
                      <select style={{ background: T.inp, border: `1px solid ${T.bdr}`, color: T.dim, borderRadius: 6, padding: '2px 6px', fontSize: 12 }}
                        value="" onChange={e => { if (e.target.value !== '') movePlayer(gi, pi, parseInt(e.target.value)); }}>
                        <option value="">Move</option>
                        {groups.map((_, ti) => ti !== gi && <option key={ti} value={ti}>Group {ti + 1}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              ))}
              {g.players.length === 0 && <div style={{ fontSize: 13, color: T.dim, padding: '8px 0' }}>Empty — move players here</div>}
              {g.players.length > 4 && <div style={{ fontSize: 12, color: T.red, marginTop: 4 }}>Max 4 players per group</div>}
            </div>
          ))}

          <div className="fx g8">
            <button className="btn bs" style={{ flex: 1 }} onClick={() => setStep(2)}>{"<"} Back</button>
            <button className="btn bp" style={{ flex: 2 }} disabled={!allValid} onClick={() => setStep(4)}>
              Next: Games {">"}
            </button>
          </div>
          {!allValid && groups.length > 0 && (
            <p style={{ fontSize: 13, color: T.dim, textAlign: 'center', marginTop: 8 }}>
              {!allGrouped ? 'All players must be in a group' : groups.length < 2 ? 'Need at least 2 groups' : 'Each group needs 2-4 players'}
            </p>
          )}
        </div>
      )}

      {/* Step 4: Games */}
      {step === 4 && (() => {
        const all4 = groups.every(g => g.players.length === 4);
        const addGame = t => {
          const g = { type: t, id: Date.now() };
          if (t === GT.STROKE) Object.assign(g, { net: true, wagerPerPlayer: 10 });
          else if (t === GT.MATCH) Object.assign(g, { team1: [0, 1], team2: [2, 3], wagerFront: 5, wagerBack: 5, wagerOverall: 10 });
          else if (t === GT.SKINS) Object.assign(g, { net: true, carryOver: true, potPerPlayer: 20 });
          else Object.assign(g, { mode: "match", wagerPerSegment: 5, pairs: sixPairs() });
          setTGames([...tGames, g]); setShowAdd(false);
        };
        const u = (id, up) => setTGames(tGames.map(g => g.id === id ? { ...g, ...up } : g));

        const createTournament = () => {
          const fmtDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
          onComplete({
            name: name.trim(),
            date: fmtDate,
            course: { name: course.name, city: course.city, tees: course.tees },
            teeName,
            teeData: course.tees.find(t => t.name === teeName) || course.tees[0],
            groups: groups.map(g => ({
              players: g.players.map(p => ({
                id: p.id, name: p.name, index: p.index,
                scores: Array(18).fill(null)
              }))
            })),
            tournamentGames: tGames,
            teamConfig: null
          });
        };

        return (
          <div>
            <div className="cd">
              <div className="t-step">Step 4 of 4</div>
              <div className="t-step-title">Games (Optional)</div>
              <p style={{ fontSize: 13, color: T.dim, marginBottom: 12 }}>
                Add bets that apply to every group. Skip this step to play without games.
              </p>
              {!all4 && <div style={{ background: T.gold + '22', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                <p style={{ fontSize: 13, color: T.gold }}>Match and 6-6-6 require all groups to have exactly 4 players.</p>
              </div>}
            </div>

            <div className="fxb mb10">
              <span className="pg-title">Games</span>
              <button className="btn bp bsm" onClick={() => setShowAdd(true)}>+ Add</button>
            </div>

            {showAdd && <div className="cd"><div className="g2">
              <button className="btn bs" onClick={() => addGame(GT.STROKE)}>Stroke</button>
              <button className="btn bs" onClick={() => addGame(GT.SKINS)}>Skins</button>
              <button className="btn bs" disabled={!all4} onClick={() => all4 && addGame(GT.MATCH)}>Match</button>
              <button className="btn bs" disabled={!all4} onClick={() => all4 && addGame(GT.SIXES)}>6-6-6</button>
            </div></div>}

            {tGames.map(g => (
              <div key={g.id} className="cd">
                <div className="fxb mb6">
                  <span className="ct" style={{ marginBottom: 0 }}>{g.type === GT.STROKE ? "Stroke" : g.type === GT.MATCH ? "Match" : g.type === GT.SKINS ? "Skins" : "6-6-6"}</span>
                  <button className="bg" style={{ color: T.red, borderColor: T.red + '33' }} onClick={() => setTGames(tGames.filter(x => x.id !== g.id))}>Remove</button>
                </div>
                {g.type === GT.STROKE && <>
                  <Tog label="Net" v={g.net} onChange={v => u(g.id, { net: v })} />
                  <div><div className="il">$/player</div><input className="inp" type="number" value={g.wagerPerPlayer} onChange={e => u(g.id, { wagerPerPlayer: parseFloat(e.target.value) || 0 })} /></div>
                </>}
                {g.type === GT.MATCH && <>
                  <p style={{ fontSize: 13, color: T.dim, marginBottom: 8 }}>Players 1&2 vs 3&4 in each group</p>
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
                </>}
              </div>
            ))}

            {tGames.length === 0 && !showAdd && (
              <div className="cd" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: T.dim }}>No games added — leaderboard only</p>
              </div>
            )}

            <div className="fx g8">
              <button className="btn bs" style={{ flex: 1 }} onClick={() => setStep(3)}>{"<"} Back</button>
              <button className="btn bp" style={{ flex: 2 }} onClick={createTournament}>
                Create Tournament {">"}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default TournamentSetup;
