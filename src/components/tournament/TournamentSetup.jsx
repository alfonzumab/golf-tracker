import { useState } from 'react';
import { T, TT, PC } from '../../theme';
import Tog from '../Toggle';

const TournamentSetup = ({ courses, players: savedPlayers, selectedCourseId, onComplete }) => {
  const [step, setStep] = useState(1);

  // Step 1: Basics
  const [name, setName] = useState('New Tournament');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [courseId, setCourseId] = useState(selectedCourseId || (courses[0]?.id ?? ''));
  const [format, setFormat] = useState('standard');

  // Step 2: Players
  const [tPlayers, setTPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestIndex, setGuestIndex] = useState('');

  // Step 3 (standard): Groups
  const [groups, setGroups] = useState([]);

  // Step 3 (rydercup): Teams
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [teamAName, setTeamAName] = useState('Team A');
  const [teamBName, setTeamBName] = useState('Team B');

  // Step 4 (rydercup): Matches
  const [matches, setMatches] = useState([]);
  const [addingMatch, setAddingMatch] = useState(null); // null | { type, t1: [], t2: [] }

  // Foursomes (Ryder Cup only - step 5)
  const [foursomes, setFoursomes] = useState([]); // Array of { players: [playerIndices] }

  // Skins (last step for both formats)
  const [skinsOn, setSkinsOn] = useState(false);
  const [skinsNet, setSkinsNet] = useState(true);
  const [skinsCarry, setSkinsCarry] = useState(false);
  const [skinsMode, setSkinsMode] = useState("pot");
  const [skinsPot, setSkinsPot] = useState(20);
  const [skinsAmount, setSkinsAmount] = useState(5);

  const course = courses.find(c => c.id === courseId) || courses[0];
  const teeName = course?.tees?.[0]?.name || '';
  const isRC = format === 'rydercup';
  const totalSteps = isRC ? 6 : 4;

  // Step 1 validation
  const step1Valid = name.trim() && course;

  // Step 2 actions
  const togglePlayerSelection = (player) => {
    const isSelected = selectedPlayers.find(sp => sp.id === player.id);
    if (isSelected) {
      setSelectedPlayers(selectedPlayers.filter(sp => sp.id !== player.id));
    } else if (selectedPlayers.length < (isRC ? 100 : 100)) { // Allow more for tournaments
      setSelectedPlayers([...selectedPlayers, { ...player }]);
    }
  };

  const addGuestPlayer = () => {
    if (!guestName.trim()) return;
    const guestId = 'guest-' + crypto.randomUUID();
    const guestPlayer = {
      id: guestId,
      name: guestName.trim(),
      index: parseFloat(guestIndex) || 0,
      isGuest: true
    };
    setSelectedPlayers([...selectedPlayers, guestPlayer]);
    setGuestName('');
    setGuestIndex('');
    setShowGuestForm(false);
  };

  const removeSelectedPlayer = (id) => {
    setSelectedPlayers(selectedPlayers.filter(sp => sp.id !== id));
  };



  const step2Valid = isRC ? selectedPlayers.length >= 4 && selectedPlayers.length % 2 === 0 : selectedPlayers.length >= 4;

  // Step 3 (standard): Groups
  const autoGroup = () => {
    const ungrouped = [...tPlayers];
    const g = [];
    const groupSize = ungrouped.length >= 8 ? 4 : Math.ceil(ungrouped.length / 2);
    while (ungrouped.length > groupSize) {
      g.push({ players: ungrouped.splice(0, groupSize) });
    }
    if (ungrouped.length > 0) g.push({ players: ungrouped });
    setGroups(g);
  };

  const movePlayer = (fromGroup, playerIdx, toGroup) => {
    const updated = groups.map(g => ({ ...g, players: [...g.players] }));
    const [player] = updated[fromGroup].players.splice(playerIdx, 1);
    updated[toGroup].players.push(player);
    setGroups(updated.filter(g => g.players.length > 0));
  };

  const addEmptyGroup = () => setGroups([...groups, { players: [] }]);

  const allGrouped = groups.reduce((sum, g) => sum + g.players.length, 0) === tPlayers.length;
  const allValid = groups.length >= 2 && groups.every(g => g.players.length >= 2 && g.players.length <= 4) && allGrouped;

  // Step 3 (rydercup): Teams
  const unassigned = tPlayers.filter(p => !teamA.find(a => a.id === p.id) && !teamB.find(b => b.id === p.id));
  const half = Math.floor(tPlayers.length / 2);
  const teamsValid = teamA.length === half && teamB.length === half && unassigned.length === 0;

  const cycleTeam = (player) => {
    const inA = teamA.find(p => p.id === player.id);
    const inB = teamB.find(p => p.id === player.id);
    if (!inA && !inB) {
      // unassigned → Team A (if not full)
      if (teamA.length < half) setTeamA([...teamA, player]);
      else if (teamB.length < half) setTeamB([...teamB, player]);
    } else if (inA) {
      // Team A → Team B (if not full)
      setTeamA(teamA.filter(p => p.id !== player.id));
      if (teamB.length < half) setTeamB([...teamB, player]);
    } else {
      // Team B → unassigned
      setTeamB(teamB.filter(p => p.id !== player.id));
    }
  };

  // Step 4 (rydercup): Matches
  const startAddMatch = (type) => setAddingMatch({ type, t1: [], t2: [] });

  const isPlayerAssigned = (teamSide, playerIdx) => {
    return matches.some(m => m.t1.includes(playerIdx) || m.t2.includes(playerIdx));
  };

  const toggleMatchPlayer = (teamSide, playerIdx) => {
    if (!addingMatch) return;
    const key = teamSide === 1 ? 't1' : 't2';
    const max = addingMatch.type === 'singles' ? 1 : 2;
    const cur = addingMatch[key];
    if (cur.includes(playerIdx)) {
      setAddingMatch({ ...addingMatch, [key]: cur.filter(i => i !== playerIdx) });
    } else if (cur.length < max && !isPlayerAssigned(teamSide, playerIdx)) {
      setAddingMatch({ ...addingMatch, [key]: [...cur, playerIdx] });
    }
  };

  const confirmMatch = () => {
    if (!addingMatch) return;
    const need = addingMatch.type === 'singles' ? 1 : 2;
    if (addingMatch.t1.length !== need || addingMatch.t2.length !== need) return;

    // For singles matches, both players must be in the same foursome
    if (addingMatch.type === 'singles' && foursomes.length > 0) {
      const player1Idx = addingMatch.t1[0];
      const player2Idx = addingMatch.t2[0];

      const player1Foursome = foursomes.find(f => f.players.includes(player1Idx));
      const player2Foursome = foursomes.find(f => f.players.includes(player2Idx));

      if (!player1Foursome || !player2Foursome || player1Foursome !== player2Foursome) {
        alert('For singles matches, both players must be in the same foursome.');
        return;
      }
    }

    setMatches([...matches, { ...addingMatch }]);
    setAddingMatch(null);
  };

  const removeMatch = (i) => setMatches(matches.filter((_, idx) => idx !== i));

  const matchesValid = matches.length >= 1;

  // Build final data
  const buildRyderCupGroups = () => {
    if (foursomes.length > 0) {
      // Use manually assigned foursomes
      return foursomes.map(f => ({
        players: f.players.map(playerIdx => {
          const player = [...teamA, ...teamB][playerIdx];
          return {
            id: player.id, name: player.name, index: player.index, scores: Array(18).fill(null)
          };
        })
      }));
    } else {
      // Default: one group per match
      return matches.map(m => {
        const t1Players = m.t1.map(i => teamA[i]);
        const t2Players = m.t2.map(i => teamB[i]);
        return {
          players: [...t1Players, ...t2Players].map(p => ({
            id: p.id, name: p.name, index: p.index, scores: Array(18).fill(null)
          }))
        };
      });
    }
  };

  const foursomeStep = isRC ? 5 : null;
  const skinsStep = isRC ? 6 : 4;
  const prevSkinsStep = isRC ? 5 : 3;
  const prevFoursomeStep = isRC ? 4 : null;

  return (
    <div className="pg">
      {/* Progress */}
      <div className="fx g8 mb12" style={{ justifyContent: 'center' }}>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
          <div key={s} style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
            background: step >= s ? T.accD + '44' : T.mut + '33',
            color: step >= s ? T.accB : T.dim,
            border: `2px solid ${step === s ? T.acc : 'transparent'}`
          }}>{s}</div>
        ))}
      </div>

      {/* Step 1: Basics + Format */}
      {step === 1 && (
        <div className="cd">
          <div className="t-step">Step 1 of {totalSteps}</div>
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
          {course && <div style={{ fontSize: 13, color: T.dim, marginBottom: 12 }}>Tee: {teeName}</div>}

          <div className="il mb6">Format</div>
          <div className="fx g6 mb6">
            <button className={`chip ${format === 'standard' ? 'sel' : ''}`} onClick={() => setFormat('standard')}>Standard</button>
            <button className={`chip ${format === 'rydercup' ? 'sel' : ''}`} onClick={() => setFormat('rydercup')}>Ryder Cup</button>
          </div>
          {isRC && <p style={{ fontSize: 13, color: T.dim }}>Two teams compete in best-ball and singles match play</p>}

          <button className="btn bp mt10" disabled={!step1Valid} onClick={() => setStep(2)}>
            Next: Add Players {">"}
          </button>
        </div>
      )}

      {/* Step 2: Players */}
      {step === 2 && (
        <div>
          <div className="cd">
            <div className="t-step">Step 2 of {totalSteps}</div>
            <div className="t-step-title">Select Players ({selectedPlayers.length})</div>
            <p style={{ fontSize: 13, color: T.dim, marginBottom: 12 }}>
              Select at least 4 players{isRC ? ' (must be even for equal teams)' : ''}. Tap players to add/remove them.
            </p>

            {savedPlayers.length > 0 && (
              <div className="mb10">
                <div className="il mb6">Players</div>
                <input className="inp mb8" placeholder="Search players..." value={playerSearch}
                  onChange={e => setPlayerSearch(e.target.value)} />
                {(() => {
                  const favorites = savedPlayers.filter(p => p.favorite);

                  if (playerSearch.trim()) {
                    // Show search results (all players matching search)
                    const filtered = savedPlayers.filter(p => p.name.toLowerCase().includes(playerSearch.toLowerCase()));
                    return (
                      <>
                        <div style={{ fontSize: 13, color: T.dim, marginBottom: 8, fontWeight: 600 }}>Search Results</div>
                        <div className="g2" style={{ gap: '8px' }}>
                          {filtered.map(p => {
                            const isSelected = selectedPlayers.find(sp => sp.id === p.id);
                            const selectedIndex = selectedPlayers.findIndex(sp => sp.id === p.id);
                            return (
                              <div key={p.id} onClick={() => togglePlayerSelection(p)} style={{
                                display: "flex", flexDirection: "column", gap: 8, padding: "12px", borderRadius: 10, cursor: "pointer",
                                background: isSelected ? PC[selectedIndex % 4] + "12" : T.bg2,
                                border: `1.5px solid ${isSelected ? PC[selectedIndex % 4] + "44" : T.bdr}`,
                                transition: "all .15s", minHeight: "80px"
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{
                                    width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 11, fontWeight: 700, background: isSelected ? PC[selectedIndex % 4] : T.mut, color: T.bg
                                  }}>
                                    {isSelected ? selectedIndex + 1 : ""}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {p.favorite && <span style={{ fontSize: 12 }}>⭐</span>}
                                      {p.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: T.dim }}>Idx: {p.index}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  } else {
                    // Show only favorites
                    return (
                      <>
                        {favorites.length > 0 && (
                          <>
                            <div style={{ fontSize: 13, color: T.dim, marginBottom: 8, fontWeight: 600 }}>⭐ Favorites</div>
                            <div className="g2" style={{ gap: '6px' }}>
                              {favorites.map(p => {
                                const isSelected = selectedPlayers.find(sp => sp.id === p.id);
                                const selectedIndex = selectedPlayers.findIndex(sp => sp.id === p.id);
                                return (
                                  <div key={p.id} onClick={() => togglePlayerSelection(p)} style={{
                                    display: "flex", flexDirection: "column", gap: 8, padding: "12px", borderRadius: 10, cursor: "pointer",
                                    background: isSelected ? PC[selectedIndex % 4] + "12" : T.bg2,
                                    border: `1.5px solid ${isSelected ? PC[selectedIndex % 4] + "44" : T.bdr}`,
                                    transition: "all .15s", minHeight: "80px"
                                  }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <div style={{
                                        width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 11, fontWeight: 700, background: isSelected ? PC[selectedIndex % 4] : T.mut, color: T.bg
                                      }}>
                                        {isSelected ? selectedIndex + 1 : ""}
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          {p.favorite && <span style={{ fontSize: 12 }}>⭐</span>}
                                          {p.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: T.dim }}>Idx: {p.index}</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                        {favorites.length === 0 && (
                          <div style={{ fontSize: 13, color: T.dim, textAlign: 'center', padding: '20px' }}>
                            No favorite players. Search to find players or add a guest.
                          </div>
                        )}
                      </>
                    );
                  }
                })()}
              </div>
            )}

            <div className="dvd" />

            <div className="fx g8 mb10">
              <button className="btn bg" onClick={() => setShowGuestForm(true)}>Add Guest Player</button>
            </div>

            {selectedPlayers.length > 0 && (
              <div className="mt8">
                <div className="il mb6">Selected Players</div>
                {selectedPlayers.map((p, i) => (
                  <div key={p.id} className="t-player-row">
                    <span style={{ color: PC[i % 4], fontSize: 13, width: 20, fontWeight: 600 }}>{i + 1}</span>
                    <span className="prow-n" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.favorite && <span style={{ fontSize: 14 }}>⭐</span>}
                      {p.name}
                      {p.isGuest && <span style={{ fontSize: 9, background: T.blue + "22", color: T.blue, padding: "1px 4px", borderRadius: 3, marginLeft: 4 }}>Guest</span>}
                    </span>
                    <span style={{ fontSize: 13, color: T.dim }}>Idx {p.index}</span>
                    <button style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', padding: 4, fontSize: 16 }}
                      onClick={() => removeSelectedPlayer(p.id)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guest Player Modal */}
          {showGuestForm && (
            <div className="mbg" onClick={() => setShowGuestForm(false)}>
              <div className="mdl" onClick={e => e.stopPropagation()}>
                <div className="mdt">Add Guest Player</div>
                <div className="mb8">
                  <div className="il">Name</div>
                  <input className="inp" placeholder="Guest name" value={guestName} onChange={e => setGuestName(e.target.value)} onKeyDown={e => e.key === "Enter" && addGuestPlayer()} />
                </div>
                <div className="mb10">
                  <div className="il">Handicap Index</div>
                  <input className="inp" type="number" step="0.1" placeholder="12.5" value={guestIndex} onChange={e => setGuestIndex(e.target.value)} onKeyDown={e => e.key === "Enter" && addGuestPlayer()} />
                </div>
                <div className="fx g8">
                  <button className="btn bs" onClick={() => { setShowGuestForm(false); setGuestName(''); setGuestIndex(''); }}>Cancel</button>
                  <button className="btn bp" onClick={addGuestPlayer}>Add Guest</button>
                </div>
              </div>
            </div>
          )}

          <div className="fx g8">
            <button className="btn bs" style={{ flex: 1 }} onClick={() => setStep(1)}>{"<"} Back</button>
            <button className="btn bp" style={{ flex: 2 }} disabled={!step2Valid}
              onClick={() => { setTPlayers(selectedPlayers); if (!isRC && groups.length === 0) autoGroup(); setStep(3); }}>
              {isRC ? 'Next: Teams' : 'Next: Groups'} {">"}
            </button>
          </div>
          {selectedPlayers.length > 0 && !step2Valid && (
            <p style={{ fontSize: 13, color: T.dim, textAlign: 'center', marginTop: 8 }}>
              {selectedPlayers.length < 4 ? `Need ${4 - selectedPlayers.length} more player${4 - selectedPlayers.length !== 1 ? 's' : ''} (minimum 4)` :
               isRC && selectedPlayers.length % 2 !== 0 ? 'Need an even number for equal teams' : ''}
            </p>
          )}
        </div>
      )}

      {/* Step 3 (standard): Groups */}
      {step === 3 && !isRC && (
        <div>
          <div className="cd">
            <div className="t-step">Step 3 of {totalSteps}</div>
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

      {/* Step 3 (rydercup): Teams */}
      {step === 3 && isRC && (
        <div>
          <div className="cd">
            <div className="t-step">Step 3 of {totalSteps}</div>
            <div className="t-step-title">Assign Teams</div>
            <p style={{ fontSize: 13, color: T.dim, marginBottom: 12 }}>
              Tap a player to assign them. Tap again to move to the other team or remove.
            </p>
          </div>

          {unassigned.length > 0 && (
            <div className="cd">
              <div className="ct" style={{ color: T.dim }}>Unassigned ({unassigned.length})</div>
              <div className="fx fw g6">
                {unassigned.map(p => (
                  <button key={p.id} className="chip" onClick={() => cycleTeam(p)}>{p.name}</button>
                ))}
              </div>
            </div>
          )}

          <div className="fx g8">
            <div className="cd" style={{ flex: 1, borderColor: TT.a + '44' }}>
              <div className="fx fxb mb6">
                <input className="inp" style={{ flex: 1, fontSize: 14, padding: '4px 8px', color: TT.a, fontWeight: 700 }}
                  value={teamAName} onChange={e => setTeamAName(e.target.value)} />
                <span style={{ fontSize: 12, color: T.dim, marginLeft: 6 }}>{teamA.length}/{half}</span>
              </div>
              {teamA.map(p => (
                <div key={p.id} className="fxb" style={{ padding: '6px 0', borderBottom: `1px solid ${T.bdr}11` }}>
                  <span style={{ fontSize: 14, color: TT.a, fontWeight: 600 }}>{p.name}</span>
                  <button style={{ background: 'none', border: 'none', color: T.dim, cursor: 'pointer', fontSize: 12, padding: 4 }}
                    onClick={() => cycleTeam(p)}>move</button>
                </div>
              ))}
              {teamA.length === 0 && <div style={{ fontSize: 13, color: T.dim, padding: 8, textAlign: 'center' }}>Tap players above</div>}
            </div>

            <div className="cd" style={{ flex: 1, borderColor: TT.b + '44' }}>
              <div className="fx fxb mb6">
                <input className="inp" style={{ flex: 1, fontSize: 14, padding: '4px 8px', color: TT.b, fontWeight: 700 }}
                  value={teamBName} onChange={e => setTeamBName(e.target.value)} />
                <span style={{ fontSize: 12, color: T.dim, marginLeft: 6 }}>{teamB.length}/{half}</span>
              </div>
              {teamB.map(p => (
                <div key={p.id} className="fxb" style={{ padding: '6px 0', borderBottom: `1px solid ${T.bdr}11` }}>
                  <span style={{ fontSize: 14, color: TT.b, fontWeight: 600 }}>{p.name}</span>
                  <button style={{ background: 'none', border: 'none', color: T.dim, cursor: 'pointer', fontSize: 12, padding: 4 }}
                    onClick={() => cycleTeam(p)}>move</button>
                </div>
              ))}
              {teamB.length === 0 && <div style={{ fontSize: 13, color: T.dim, padding: 8, textAlign: 'center' }}>Tap players above</div>}
            </div>
          </div>

          <div className="fx g8">
            <button className="btn bs" style={{ flex: 1 }} onClick={() => setStep(2)}>{"<"} Back</button>
            <button className="btn bp" style={{ flex: 2 }} disabled={!teamsValid} onClick={() => setStep(4)}>
              Next: Matches {">"}
            </button>
          </div>
        </div>
      )}

      {/* Step 4 (rydercup): Matches */}
      {step === 4 && isRC && (
        <div>
          <div className="cd">
            <div className="t-step">Step 4 of {totalSteps}</div>
            <div className="t-step-title">Create Matches</div>
            <p style={{ fontSize: 13, color: T.dim, marginBottom: 12 }}>
              Set up best-ball (2v2) and singles (1v1) matches between teams.
            </p>
            <div className="fx g6">
              <button className="btn bg" style={{ flex: 1 }} onClick={() => startAddMatch('bestball')}>+ Best Ball (2v2)</button>
              <button className="btn bg" style={{ flex: 1 }} onClick={() => startAddMatch('singles')}>+ Singles (1v1)</button>
            </div>
          </div>

          {/* Add match form */}
          {addingMatch && (
            <div className="cd" style={{ border: `1.5px solid ${T.acc}` }}>
              <div className="ct">{addingMatch.type === 'bestball' ? 'Best Ball (2v2)' : 'Singles (1v1)'}</div>

              <div className="fx g8 mb8">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: TT.a, fontWeight: 700, marginBottom: 6 }}>
                    {teamAName} — pick {addingMatch.type === 'singles' ? 1 : 2}
                  </div>
                  {teamA.map((p, i) => {
                    const assigned = isPlayerAssigned(1, i);
                    return (
                      <button key={p.id} className={`chip ${addingMatch.t1.includes(i) ? 'sel' : ''}`}
                        style={{
                          display: 'block',
                          width: '100%',
                          marginBottom: 4,
                          textAlign: 'left',
                          opacity: assigned ? 0.5 : 1,
                          cursor: assigned ? 'not-allowed' : 'pointer'
                        }}
                        disabled={assigned}
                        onClick={() => toggleMatchPlayer(1, i)}
                        title={assigned ? 'Already assigned to another match' : ''}>
                        {p.name}{assigned ? ' (in match)' : ''}
                      </button>
                    );
                  })}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: TT.b, fontWeight: 700, marginBottom: 6 }}>
                    {teamBName} — pick {addingMatch.type === 'singles' ? 1 : 2}
                  </div>
                  {teamB.map((p, i) => {
                    const assigned = isPlayerAssigned(2, i);
                    return (
                      <button key={p.id} className={`chip ${addingMatch.t2.includes(i) ? 'sel' : ''}`}
                        style={{
                          display: 'block',
                          width: '100%',
                          marginBottom: 4,
                          textAlign: 'left',
                          opacity: assigned ? 0.5 : 1,
                          cursor: assigned ? 'not-allowed' : 'pointer'
                        }}
                        disabled={assigned}
                        onClick={() => toggleMatchPlayer(2, i)}
                        title={assigned ? 'Already assigned to another match' : ''}>
                        {p.name}{assigned ? ' (in match)' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="fx g6">
                <button className="btn bp" style={{ flex: 1 }} onClick={confirmMatch}
                  disabled={addingMatch.t1.length !== (addingMatch.type === 'singles' ? 1 : 2) || addingMatch.t2.length !== (addingMatch.type === 'singles' ? 1 : 2)}>
                  Add Match
                </button>
                <button className="btn bs" style={{ flex: 1 }} onClick={() => setAddingMatch(null)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Match list */}
          {matches.map((m, mi) => {
            const t1Names = m.t1.map(i => teamA[i]?.name.split(' ')[0]).join(' & ');
            const t2Names = m.t2.map(i => teamB[i]?.name.split(' ')[0]).join(' & ');
            return (
              <div key={mi} className="cd">
                <div className="fxb">
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: T.mut + '33', color: T.dim, marginRight: 8 }}>
                      {m.type === 'bestball' ? 'Best Ball' : 'Singles'}
                    </span>
                    <span style={{ fontSize: 14 }}>
                      <span style={{ color: TT.a, fontWeight: 600 }}>{t1Names}</span>
                      <span style={{ color: T.dim }}> vs </span>
                      <span style={{ color: TT.b, fontWeight: 600 }}>{t2Names}</span>
                    </span>
                  </div>
                  <button style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', fontSize: 14, padding: 4 }}
                    onClick={() => removeMatch(mi)}>x</button>
                </div>
              </div>
            );
          })}

          {matches.length === 0 && !addingMatch && (
            <div className="cd" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: T.dim }}>No matches yet — add at least one</p>
            </div>
          )}

          <div className="fx g8">
            <button className="btn bs" style={{ flex: 1 }} onClick={() => setStep(3)}>{"<"} Back</button>
            <button className="btn bp" style={{ flex: 2 }} disabled={!matchesValid} onClick={() => setStep(5)}>
              Next: Games {">"}
            </button>
          </div>
        </div>
      )}

      {/* Foursome assignment step (step 5 rydercup only) */}
      {step === foursomeStep && (() => {
        const allPlayers = [...teamA, ...teamB];
        const assignedPlayers = new Set(foursomes.flatMap(f => f.players));
        const availablePlayers = allPlayers.map((_, i) => i).filter(i => !assignedPlayers.has(i));

        return (
          <div>
            <div className="t-step">Step {foursomeStep} of {totalSteps}</div>
            <div className="t-step-title">Assign Foursomes (Optional)</div>
            <p style={{ fontSize: 13, color: T.dim, marginBottom: 16 }}>
              Group players into foursomes for side games. Players in the same foursome can play Stroke, Skins, or Match games together.
              If you skip this, each match becomes its own group.
            </p>

            <div className="fx g6 mb12">
              <button className="btn bg" disabled={availablePlayers.length < 2} onClick={() => {
                if (availablePlayers.length >= 2) {
                  // Smart foursome assignment considering singles matches
                  const singlesPairs = new Map();

                  // Find all singles match pairs
                  matches.forEach(match => {
                    if (match.type === 'singles') {
                      const player1 = match.t1[0];
                      const player2 = match.t2[0];
                      singlesPairs.set(player1, player2);
                      singlesPairs.set(player2, player1);
                    }
                  });

                  // Group players by their singles match relationships
                  const groups = [];
                  const processed = new Set();

                  availablePlayers.forEach(playerIdx => {
                    if (processed.has(playerIdx)) return;

                    const group = [playerIdx];
                    processed.add(playerIdx);

                    // If this player has a singles partner, add them
                    const partner = singlesPairs.get(playerIdx);
                    if (partner && availablePlayers.includes(partner) && !processed.has(partner)) {
                      group.push(partner);
                      processed.add(partner);
                    }

                    // Fill the group up to 4 players
                    availablePlayers.forEach(otherIdx => {
                      if (!processed.has(otherIdx) && group.length < 4) {
                        group.push(otherIdx);
                        processed.add(otherIdx);
                      }
                    });

                    if (group.length >= 2) {
                      groups.push(group);
                    }
                  });

                  // Create foursomes from the groups
                  const newFoursomes = groups.map(group => ({ players: group }));
                  setFoursomes([...foursomes, ...newFoursomes]);
                }
              }}>Add Foursome</button>
              <button className="btn bs" onClick={() => setFoursomes([])}>Clear All</button>
            </div>

            {foursomes.map((f, fi) => (
              <div key={fi} className="cd mb8">
                <div className="fxb mb6">
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Foursome {fi + 1}</span>
                  <button style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', fontSize: 14, padding: 4 }}
                    onClick={() => setFoursomes(foursomes.filter((_, i) => i !== fi))}>x</button>
                </div>
                <div className="fx fw g6">
                  {f.players.map(playerIdx => {
                    const player = allPlayers[playerIdx];
                    return (
                      <div key={playerIdx} className="chip sel" style={{ cursor: 'pointer' }}
                        onClick={() => {
                          // Remove player from foursome
                          const newPlayers = f.players.filter(p => p !== playerIdx);
                          if (newPlayers.length > 0) {
                            setFoursomes(foursomes.map((f, i) => i === fi ? { ...f, players: newPlayers } : f));
                          } else {
                            setFoursomes(foursomes.filter((_, i) => i !== fi));
                          }
                        }}>
                        {player.name}
                      </div>
                    );
                  })}
                  {f.players.length < 4 && (
                    <select style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${T.bdr}` }}
                      onChange={e => {
                        const newPlayerIdx = parseInt(e.target.value);
                        if (newPlayerIdx >= 0 && !f.players.includes(newPlayerIdx)) {
                          setFoursomes(foursomes.map((f, i) => i === fi ? { ...f, players: [...f.players, newPlayerIdx] } : f));
                        }
                        e.target.value = '';
                      }}>
                      <option value="">Add player...</option>
                      {allPlayers.map((p, i) => (
                        !assignedPlayers.has(i) || f.players.includes(i) ? (
                          <option key={i} value={i}>{p.name}</option>
                        ) : null
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}

            <div className="fx g6">
              <button className="btn bs" onClick={() => setStep(prevFoursomeStep)}>Back</button>
              <button className="btn bp" onClick={() => setStep(skinsStep)}>Continue</button>
            </div>
          </div>
        );
      })()}

      {/* Skins step (step 4 standard, step 6 rydercup) */}
      {step === skinsStep && (() => {
        const finalGroups = isRC ? buildRyderCupGroups() : groups;
        const totalPlayers = finalGroups.reduce((sum, g) => sum + g.players.length, 0);

        const createTournament = () => {
          const fmtDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
          const tGames = skinsOn ? [{ type: 'skins', net: skinsNet, carryOver: skinsCarry, skinsMode: skinsMode, potPerPlayer: skinsPot, amountPerSkin: skinsAmount }] : [];

          const builtGroups = isRC ? buildRyderCupGroups() : groups.map(g => ({
            players: g.players.map(p => ({
              id: p.id, name: p.name, index: p.index,
              scores: Array(18).fill(null)
            }))
          }));

          onComplete({
            name: name.trim(),
            date: fmtDate,
            course: { name: course.name, city: course.city, tees: course.tees },
            teeName,
            teeData: course.tees.find(t => t.name === teeName) || course.tees[0],
            groups: builtGroups,
            tournamentGames: tGames,
            format,
            teamConfig: isRC ? {
              teams: [
                { name: teamAName, color: TT.a, playerIds: teamA.map(p => p.id) },
                { name: teamBName, color: TT.b, playerIds: teamB.map(p => p.id) }
              ],
              matches: matches.map((m, i) => ({
                type: m.type, t1: m.t1, t2: m.t2, groupIdx: i
              }))
            } : null
          });
        };

        return (
          <div>
            <div className="cd">
              <div className="t-step">Step {skinsStep} of {totalSteps}</div>
              <div className="t-step-title">Tournament Skins (Optional)</div>
              <p style={{ fontSize: 13, color: T.dim, marginBottom: 12 }}>
                All {totalPlayers} players compete for skins across every {isRC ? 'match' : 'group'}. {isRC ? '' : 'Each group can also add their own side games during scoring.'}
              </p>

              <Tog label="Enable Tournament Skins" v={skinsOn} onChange={setSkinsOn} />

              {skinsOn && <>
                <div className="il mb6">Payment Mode</div>
                <div className="fx g6 mb10">
                  <button className={`chip ${skinsMode === "pot" ? "sel" : ""}`} onClick={() => setSkinsMode("pot")}>Pot</button>
                  <button className={`chip ${skinsMode === "perSkin" ? "sel" : ""}`} onClick={() => setSkinsMode("perSkin")}>Per Skin</button>
                </div>
                <Tog label="Net (use handicap)" v={skinsNet} onChange={setSkinsNet} />
                <Tog label="Carry-over" v={skinsCarry} onChange={setSkinsCarry} />
                <div className="mt8">
                  <div className="il">{skinsMode === "perSkin" ? "$/skin" : "Pot $/player"}</div>
                  <input className="inp" type="number" value={skinsMode === "perSkin" ? skinsAmount : skinsPot} onChange={e => skinsMode === "perSkin" ? setSkinsAmount(parseFloat(e.target.value) || 0) : setSkinsPot(parseFloat(e.target.value) || 0)} />
                </div>
                <div style={{ fontSize: 13, color: T.accB, marginTop: 8 }}>
                  {skinsMode === "perSkin"
                    ? `Example: With 6 skins, a player could lose up to $${skinsAmount * 6} (${skinsAmount}/skin × 6 skins)`
                    : `Total pot: $${skinsPot * totalPlayers} (${totalPlayers} players × $${skinsPot})`
                  }
                </div>
              </>}
            </div>

            {!skinsOn && (
              <div className="cd" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: T.dim }}>
                  {isRC ? 'No tournament skins — match play standings only.' : 'No tournament skins — leaderboard only. Groups can still add their own games.'}
                </p>
              </div>
            )}

            <div className="fx g8">
              <button className="btn bs" style={{ flex: 1 }} onClick={() => setStep(prevSkinsStep)}>{"<"} Back</button>
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
