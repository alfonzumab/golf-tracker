import { useState } from 'react';
import { T, PC } from '../theme';
import { calcCH, getStrokes } from '../utils/golf';

const Home = ({ courses, players, selectedCourseId, setSelectedCourseId, onStart, round, go, onJoinRound }) => {
  const [sel, setSel] = useState([]);
  const [tees, setTees] = useState({});
  const [showNewRound, setShowNewRound] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);

  const course = courses.find(c => c.id === selectedCourseId) || courses[0];

  const tog = id => {
    if (sel.includes(id)) setSel(sel.filter(s => s !== id));
    else if (sel.length < 4) {
      setSel([...sel, id]);
      if (!tees[id] && course) setTees({ ...tees, [id]: course.tees[0]?.name || "" });
    }
  };

  const rdy = course && course.tees.some(t => t.rating > 0 && t.slope > 0);

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
      try { await navigator.share({ title: 'Join my round', text: `Join my golf round! Code: ${code}` }); } catch {}
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
          <select className="inp mb10" value={selectedCourseId || ""} onChange={e => { setSelectedCourseId(e.target.value); setSel([]); setTees({}); }}>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.city}</option>)}
          </select>
          {!rdy && <div style={{ background: T.gold + "22", padding: 12, borderRadius: 10, marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: T.gold, fontWeight: 600 }}>This course needs tee data (rating/slope).</p>
            <button className="btn bg mt8" style={{ color: T.gold, borderColor: T.gold + "44" }} onClick={() => go("courses")}>Edit Course {">"}</button>
          </div>}
          <div className="il mb6">Select 4 Players</div>
          {players.map(p => {
            const s = sel.includes(p.id), ci = sel.indexOf(p.id);
            return (
              <div key={p.id} onClick={() => tog(p.id)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, marginBottom: 4, cursor: "pointer",
                background: s ? PC[ci] + "12" : "transparent", border: `1.5px solid ${s ? PC[ci] + "44" : T.bdr}`,
                transition: "all .15s"
              }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, background: s ? PC[ci] : T.mut, color: T.bg }}>{s ? ci + 1 : ""}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: T.dim }}>Index: {p.index}</div>
                </div>
                {s && course && <select className="inp ism" style={{ width: 90 }} value={tees[p.id] || course.tees[0]?.name} onChange={e => { e.stopPropagation(); setTees({ ...tees, [p.id]: e.target.value }); }}>
                  {course.tees.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>}
              </div>
            );
          })}
        </div>
        {sel.length === 4 && rdy && course && <button className="btn bp" style={{ fontSize: 16, padding: 16 }} onClick={() => {
          const rp = sel.map((id, i) => {
            const p = players.find(x => x.id === id);
            const tn = tees[id] || course.tees[0]?.name;
            const tee = course.tees.find(t => t.name === tn) || course.tees[0];
            const tp = tee.pars.reduce((a, b) => a + b, 0);
            const ch = calcCH(p.index, tee.slope, tee.rating, tp);
            return { ...p, tee: tn, teeData: tee, courseHandicap: ch, strokeHoles: getStrokes(ch, tee.handicaps), scores: Array(18).fill(null), colorIdx: i };
          });
          onStart(rp, course);
        }}>Set Up Games {">"}</button>}
        {sel.length > 0 && sel.length < 4 && <p style={{ fontSize: 13, color: T.dim, textAlign: "center", marginTop: 8 }}>Select {4 - sel.length} more player{4 - sel.length !== 1 ? "s" : ""}</p>}
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

      {/* Join a round */}
      {!round && (
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
      )}

      {/* Tournament button */}
      <button className="btn bs mb10" style={{ fontSize: 15 }} onClick={() => go("thub")}>
        Tournament Mode
      </button>

      {/* New round section — always available */}
      {round && !showNewRound ? (
        <button className="btn bg" onClick={() => setShowNewRound(true)}>Start a Different Round</button>
      ) : (
        renderNewRound()
      )}
    </div>
  );
};

export default Home;
