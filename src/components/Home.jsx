import { useState } from 'react';
import { T, PC } from '../theme';
import { calcCH, getStrokes, fmt$ } from '../utils/golf';

const Home = ({ courses, players, rounds, selectedCourseId, setSelectedCourseId, onStart, round, go, onJoinRound, tournament, onLeaveTournament, quickStats, profile }) => {
  const [sel, setSel] = useState([]);
  const [tees, setTees] = useState({});
  const [showNewRound, setShowNewRound] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);
  const [search, setSearch] = useState('');
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestIndex, setGuestIndex] = useState('');
  const [hcpOverrides, setHcpOverrides] = useState({});

  const course = courses.find(c => c.id === selectedCourseId) || courses[0];

  const tog = id => {
    if (sel.includes(id)) setSel(sel.filter(s => s !== id));
    else if (sel.length < 4) { // max 4 players
      setSel([...sel, id]);
      if (!tees[id] && course) setTees({ ...tees, [id]: course.tees[0]?.name || "" });
    }
  };

  const addGuest = () => {
    if (!guestName.trim() || sel.length >= 4) return;
    const guestId = 'guest-' + crypto.randomUUID();
    // Add guest to selection (will be included in round but not saved to DB)
    setSel([...sel, guestId]);
    if (course) setTees({ ...tees, [guestId]: course.tees[0]?.name || "" });
    setGuestName('');
    setGuestIndex('');
    setShowGuestForm(false);
  };

  const rdy = course && course.tees.some(t => t.rating > 0 && t.slope > 0);

  const renderPlayer = (p) => {
    const s = sel.includes(p.id), ci = sel.indexOf(p.id);
    return (
      <div key={p.id} onClick={() => tog(p.id)} style={{
        display: "flex", flexDirection: "column", gap: 8, padding: "12px", borderRadius: 10, cursor: "pointer",
        background: s ? PC[ci] + "12" : T.bg2, border: `1.5px solid ${s ? PC[ci] + "44" : T.bdr}`,
        transition: "all .15s", minHeight: "80px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: s ? PC[ci] : T.mut, color: T.bg }}>{s ? ci + 1 : ""}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.favorite && <span style={{ fontSize: 12 }}>⭐</span>}
              {p.name}
              {p.isGuest && <span style={{ fontSize: 9, background: T.blue + "22", color: T.blue, padding: "1px 4px", borderRadius: 3 }}>Guest</span>}
            </div>
            <div style={{ fontSize: 11, color: T.dim }}>Idx: {p.index}</div>
          </div>
        </div>
      </div>
    );
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareCode = async (code) => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Join my round', text: `Join my golf round! Code: ${code}\n\nsettleup-golf.com` }); } catch {
        // Fallback to copy if share fails
      }
    } else {
      copyCode(code);
    }
  };

  const handleJoin = async () => {
    if (joinCode.length !== 6 || !onJoinRound) return;
    setJoining(true);
    await onJoinRound(joinCode);
    setJoining(false);
  };

  const renderNewRound = () => {
    if (courses.length === 0) {
      return (
        <div className="empty">
          <div className="empty-i">{"\u26F3"}</div>
          <div className="empty-t">No courses yet</div>
          <div style={{ fontSize: 14, color: T.dim, marginTop: 8 }}>Add a course in the Courses tab to get started</div>
          <button className="btn bp bsm mt10" onClick={() => go("courses")}>Go to Courses</button>
        </div>
      );
    }

    if (players.length === 0) {
      return (
        <div className="empty">
          <div className="empty-i">{"\uD83D\uDC65"}</div>
          <div className="empty-t">No players yet</div>
          <div style={{ fontSize: 14, color: T.dim, marginTop: 8 }}>Add players in the Players tab to start a round</div>
          <button className="btn bp bsm mt10" onClick={() => go("players")}>Go to Players</button>
        </div>
      );
    }

    return (
      <>
        <div className="cd">
          <div className="ct">New Round</div>
          <div className="il mb6">Select Course</div>
          <select className="inp mb10" value={selectedCourseId || ""} onChange={e => { setSelectedCourseId(e.target.value); setSel([]); setTees({}); setShowPlayers(false); }}>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.city}</option>)}
          </select>
          {!rdy && <div style={{ background: T.gold + "22", padding: 12, borderRadius: 10, marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: T.gold, fontWeight: 600 }}>This course needs tee data (rating/slope).</p>
            <button className="btn bg mt8" style={{ color: T.gold, borderColor: T.gold + "44" }} onClick={() => go("courses")}>Edit Course {">"}</button>
          </div>}
          {rdy && !showPlayers && (
            <button className="btn bp" onClick={() => setShowPlayers(true)}>Add Players {">"}</button>
          )}
          {showPlayers && (
            <>
              <div className="il mb6">Select 3-4 Players</div>
              <div className="fxb mb8">
                <input
                  className="inp"
                  style={{ flex: 1 }}
                  placeholder="Search players..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <button className="btn bg bsm" onClick={() => setShowGuestForm(true)}>+ Guest</button>
              </div>

              {showGuestForm && (
                <div className="cd mb10">
                  <div className="ct">Add Guest Player</div>
                  <div className="mb8"><div className="il">Name</div>
                    <input className="inp" placeholder="Guest name" value={guestName} onChange={e => setGuestName(e.target.value)} />
                  </div>
                  <div className="mb10"><div className="il">Handicap Index</div>
                    <input className="inp" type="number" step="0.1" placeholder="12.5" value={guestIndex} onChange={e => setGuestIndex(e.target.value)} />
                  </div>
                  <div className="fx g6">
                    <button className="btn bp" onClick={addGuest}>Add Guest</button>
                    <button className="btn bs" onClick={() => { setShowGuestForm(false); setGuestName(''); setGuestIndex(''); }}>Cancel</button>
                  </div>
                </div>
              )}

              {(() => {
                // Calculate recent players from the last few rounds
                const recentPlayerIds = new Set();
                rounds.slice(-5).reverse().forEach(r => {
                  r.players.forEach(p => {
                    if (!p.isGuest) recentPlayerIds.add(p.id);
                  });
                });
                const recentPlayers = players.filter(p => recentPlayerIds.has(p.id) && !p.favorite);
                const favorites = players.filter(p => p.favorite);

                if (search.trim()) {
                  // Show search results
                  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
                  return (
                    <>
                      <div style={{ fontSize: 13, color: T.dim, marginBottom: 8, fontWeight: 600 }}>Search Results</div>
                      <div className="g2" style={{ gap: '6px' }}>
                        {filtered.map(p => renderPlayer(p))}
                      </div>
                    </>
                  );
                } else {
                  // Show favorites and recents
                  return (
                    <>
                      {favorites.length > 0 && (
                        <>
                          <div style={{ fontSize: 13, color: T.dim, marginBottom: 8, fontWeight: 600 }}>⭐ Favorites</div>
                          <div className="g2" style={{ gap: '6px', marginBottom: '16px' }}>
                            {favorites.map(p => renderPlayer(p))}
                          </div>
                        </>
                      )}
                      {recentPlayers.length > 0 && (
                        <>
                          <div style={{ fontSize: 13, color: T.dim, marginBottom: 8, fontWeight: 600 }}>Recent</div>
                          <div className="g2" style={{ gap: '6px' }}>
                            {recentPlayers.map(p => renderPlayer(p))}
                          </div>
                        </>
                      )}
                    </>
                  );
                }
              })()}
            </>
          )}

          {sel.length > 0 && (
            <div className="mb10">
              <div style={{ fontSize: 14, color: T.dim, marginBottom: 8, fontWeight: 600 }}>Selected Players</div>
              {sel.map((id, i) => {
                const p = [...players].find(x => x.id === id);
                const isGuest = id.startsWith('guest-');
                const guestPlayer = isGuest ? { id, name: 'Guest', index: 0, isGuest: true } : null;
                const player = p || guestPlayer;
                if (!player) return null;
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: PC[i] + "08", borderRadius: 8, marginBottom: 6 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: PC[i], color: T.bg }}>{i + 1}</div>
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
                      {player.name}
                      {player.isGuest && <span style={{ fontSize: 10, background: T.blue + "22", color: T.blue, padding: "1px 4px", borderRadius: 3, marginLeft: 6 }}>Guest</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, color: T.dim }}>HCP:</span>
                      <input
                        className="inp ism"
                        type="number"
                        step="0.1"
                        value={hcpOverrides[id] !== undefined ? hcpOverrides[id] : player.index}
                        onChange={e => setHcpOverrides({ ...hcpOverrides, [id]: e.target.value })}
                        style={{ width: 60 }}
                      />
                    </div>
                    <button className="bg bsm" style={{ color: T.red, borderColor: T.red + "33" }} onClick={() => {
                      setSel(sel.filter(s => s !== id));
                      const newTees = { ...tees };
                      delete newTees[id];
                      setTees(newTees);
                      const newOverrides = { ...hcpOverrides };
                      delete newOverrides[id];
                      setHcpOverrides(newOverrides);
                    }}>×</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {(sel.length === 3 || sel.length === 4) && rdy && course && <button className="btn bp" style={{ fontSize: 16, padding: 16 }} onClick={() => {
          // Use the current players list which may include guests
          const currentPlayers = [...players];
          const rp = sel.map((id, i) => {
            const p = currentPlayers.find(x => x.id === id);
            const isGuest = id.startsWith('guest-');
            const player = p || (isGuest ? { id, name: 'Guest', index: 0, isGuest: true } : null);
            const overrideIndex = hcpOverrides[id] !== undefined ? parseFloat(hcpOverrides[id]) : player.index;
            const tn = tees[id] || course.tees[0]?.name;
            const tee = course.tees.find(t => t.name === tn) || course.tees[0];
            const tp = tee.pars.reduce((a, b) => a + b, 0);
            const ch = calcCH(overrideIndex, tee.slope, tee.rating, tp);
            return { ...player, index: overrideIndex, tee: tn, teeData: tee, courseHandicap: ch, strokeHoles: getStrokes(ch, tee.handicaps), scores: Array(18).fill(null), colorIdx: i };
          });
          onStart(rp, course);
        }}>Set Up Games {">"}</button>}
        {showPlayers && sel.length > 0 && sel.length < 3 && <p style={{ fontSize: 13, color: T.dim, textAlign: "center", marginTop: 8 }}>Select {3 - sel.length} more player{3 - sel.length !== 1 ? "s" : ""} (3 or 4 needed)</p>}
      </>
    );
  };

  return (
    <div className="pg">
      {/* Active round card with share code */}
      {round && (
        <div className="cd">
          <div className="ct">Round in Progress</div>
          <p style={{ fontSize: 14, color: T.dim, marginBottom: 4 }}>{round.course.name}</p>
          <p style={{ fontSize: 14, color: T.dim, marginBottom: 12 }}>{round.players.map(p => p.name).join(" | ")}</p>
          <div style={{ fontSize: 13, color: T.accB, marginBottom: 12 }}>{Math.min(...round.players.map(p => p.scores.filter(s => s != null).length))}/18 holes | {round.games.length} game{round.games.length !== 1 ? "s" : ""}</div>

          {/* Share code */}
          {round.shareCode && (
            <div style={{ background: T.inp, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: 12, marginBottom: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: T.dim, marginBottom: 4 }}>Share Code</div>
              <div style={{ fontFamily: "'DM Sans', monospace", fontSize: 22, fontWeight: 700, letterSpacing: 4, color: T.accB }}>{round.shareCode}</div>
              <div className="fx g6 mt8" style={{ justifyContent: 'center' }}>
                <button className="btn bg bsm" onClick={() => copyCode(round.shareCode)}>{copied ? 'Copied!' : 'Copy'}</button>
                <button className="btn bg bsm" onClick={() => shareCode(round.shareCode)}>Share</button>
              </div>
            </div>
          )}

          <button className="btn bp mb6" onClick={() => go("score")}>Continue Scoring {">"}</button>
          <button className="btn bs" onClick={() => go("bets")}>View Bets {">"}</button>
        </div>
      )}

      {/* Join a round — always visible */}
      <div className="cd mb10">
        <div className="ct">Join a Round</div>
        <p style={{ fontSize: 13, color: T.dim, marginBottom: 10 }}>Enter a share code to join someone else's round</p>
        <div className="fx g6">
          <input
            className="t-code-inp"
            style={{ flex: 1, fontSize: 20, padding: 10 }}
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="ABC123"
            maxLength={6}
          />
          <button className="btn bp bsm" style={{ flexShrink: 0 }} disabled={joinCode.length !== 6 || joining} onClick={handleJoin}>
            {joining ? '...' : 'Join'}
          </button>
        </div>
      </div>

      {/* Active tournament resume card */}
      {tournament && (
        <div className="cd mb10">
          <div className="ct">Active Tournament</div>
          <p style={{ fontSize: 14, color: T.dim, marginBottom: 4 }}>{tournament.name}</p>
          <p style={{ fontSize: 13, color: T.dim, marginBottom: 4 }}>{tournament.course.name}</p>
          <div className={`t-status ${tournament.status}`} style={{ display: 'inline-block', marginBottom: 12 }}>
            {tournament.status === 'setup' ? 'Setting Up' : tournament.status === 'live' ? 'Live' : 'Finished'}
          </div>
          <button className="btn bp mb6" onClick={() => go(tournament.status === 'live' ? 'tscore' : 'tlobby')}>
            Resume Tournament {">"}
          </button>
          <button className="btn bg" style={{ color: T.red, borderColor: T.red + '33', fontSize: 13 }} onClick={onLeaveTournament}>
            Leave Tournament
          </button>
        </div>
      )}

      {/* Stats teaser card */}
      {profile?.linked_player_id && quickStats && (
        <div className="cd mb10" onClick={() => go('stats')} style={{ cursor: 'pointer' }}>
          <div className="fxb">
            <span className="ct" style={{ marginBottom: 0 }}>Your Stats</span>
            <span style={{ color: T.dim, fontSize: 14 }}>▸</span>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <div style={{ flex: 1, textAlign: 'center', background: T.bg2, borderRadius: 8, padding: '8px 4px' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: quickStats.lifetimeTotal >= 0 ? T.accB : T.red }}>
                {fmt$(quickStats.lifetimeTotal)}
              </div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>Earnings</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', background: T.bg2, borderRadius: 8, padding: '8px 4px' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.txt }}>{quickStats.roundCount}</div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>Rounds</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', background: T.bg2, borderRadius: 8, padding: '8px 4px' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: quickStats.currentStreakType === 'win' ? T.accB : quickStats.currentStreakType === 'lose' ? T.red : T.dim }}>
                {quickStats.currentStreak > 0 ? quickStats.currentStreak : '—'}
              </div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
                {quickStats.currentStreakType === 'win' ? 'W Streak' : quickStats.currentStreakType === 'lose' ? 'L Streak' : 'Streak'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New round section — always available */}
      <div className="mb10">
        {round && !showNewRound ? (
          <button className="btn bg" onClick={() => setShowNewRound(true)}>Start a Different Round</button>
        ) : (
          renderNewRound()
        )}
      </div>

      {/* Tournament button */}
      {!tournament && (
        <button className="btn bs" style={{ fontSize: 15 }} onClick={() => go("thub")}>
          Tournament Mode
        </button>
      )}
    </div>
  );
};

export default Home;
