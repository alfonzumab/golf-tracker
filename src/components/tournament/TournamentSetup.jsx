import { useState } from 'react';
import { T } from '../../theme';

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
        {[1, 2, 3].map(s => (
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
          <div className="t-step">Step 1 of 3</div>
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
            <div className="t-step">Step 2 of 3</div>
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
            <div className="t-step">Step 3 of 3</div>
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
            <button className="btn bp" style={{ flex: 2 }} disabled={!allValid}
              onClick={() => {
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
                    })),
                    games: []
                  })),
                  tournamentGames: {},
                  teamConfig: null
                });
              }}>
              Create Tournament {">"}
            </button>
          </div>
          {!allValid && groups.length > 0 && (
            <p style={{ fontSize: 13, color: T.dim, textAlign: 'center', marginTop: 8 }}>
              {!allGrouped ? 'All players must be in a group' : groups.length < 2 ? 'Need at least 2 groups' : 'Each group needs 2-4 players'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TournamentSetup;
