import { useState, useEffect } from 'react';
import './styles.css';
import { T } from './theme';
import { supabase } from './lib/supabase';
import {
  sv, ld,
  loadPlayers, savePlayers,
  loadCourses, saveCourses,
  loadRounds, saveRound,
  loadCurrentRound, saveCurrentRound, clearCurrentRound,
  loadSelectedCourse, saveSelectedCourse,
  importLocalData,
  joinRound, generateShareCode
} from './utils/storage';
import { createTournament, getTournament, startTournament, saveActiveTournament, clearActiveTournament, loadGuestInfo, clearGuestInfo } from './utils/tournamentStorage';
import { calcAll } from './utils/calc';
import { fmt$ } from './utils/golf';
import Auth from './components/Auth';
import Nav from './components/Nav';
import Mdl from './components/Modal';
import Home from './components/Home';
import Players from './components/Players';
import Courses from './components/Courses';
import Setup from './components/Setup';
import Scoring from './components/Scoring';
import Bets from './components/Bets';
import Hist from './components/History';
import TournamentHub from './components/tournament/TournamentHub';
import TournamentSetup from './components/tournament/TournamentSetup';
import TournamentLobby from './components/tournament/TournamentLobby';
import TournamentJoin from './components/tournament/TournamentJoin';
import TournamentNav from './components/tournament/TournamentNav';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out
  const [pg, setPg] = useState("home");
  const [players, setPlayers] = useState(() => ld("players", []));
  const [courses, setCourses] = useState(() => ld("courses", []));
  const [selectedCourseId, setSelectedCourseId] = useState(() => ld("selectedCourse", null));
  const [round, setRound] = useState(() => ld("currentRound", null));
  const [rounds, setRounds] = useState(() => ld("rounds", []));
  const [setup, setSetup] = useState(null);
  const [setupCourse, setSetupCourse] = useState(null);
  const [modal, setModal] = useState(null);

  // Tournament state
  const [tournament, setTournament] = useState(null);
  const [tournamentGuest, setTournamentGuest] = useState(null);
  const [joinCode, setJoinCode] = useState(null);

  // Listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load data from Supabase when logged in
  useEffect(() => {
    if (!session) return;
    const load = async () => {
      await importLocalData();
      const [p, c, r, cr, sc] = await Promise.all([
        loadPlayers(), loadCourses(), loadRounds(), loadCurrentRound(), loadSelectedCourse()
      ]);
      setPlayers(p);
      setCourses(c);
      setRounds(r);
      if (cr) {
        // Auto-generate share code for rounds created before the feature
        if (!cr.shareCode) {
          cr.shareCode = generateShareCode();
          sv('currentRound', cr);
          saveCurrentRound(cr);
        }
        setRound(cr);
      }
      if (sc) setSelectedCourseId(sc);
      else if (c.length > 0) setSelectedCourseId(c[0].id);
    };
    load();
  }, [session]);

  // Poll Supabase for score updates every 10s (cross-device sync)
  useEffect(() => {
    if (!session) return;
    const id = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { data } = await supabase.from('rounds').select('*').eq('is_current', true).limit(1);
        if (data && data.length > 0) {
          const r = data[0];
          const cr = { id: r.id, date: r.date, course: r.course, players: r.players, games: r.games, shareCode: r.share_code };
          setRound(cr);
          sv('currentRound', cr);
        }
      } catch {}
    }, 10000);
    return () => clearInterval(id);
  }, [session]);

  const go = p => setPg(p);
  const isTournamentPg = pg.startsWith('t');

  // Wrappers that save to both localStorage and Supabase
  const handleSetPlayers = (up) => { setPlayers(up); sv("players", up); savePlayers(up); };
  const handleSetCourses = (up) => { setCourses(up); sv("courses", up); saveCourses(up); };
  const handleSetSelectedCourse = (id) => { setSelectedCourseId(id); sv("selectedCourse", id); saveSelectedCourse(id); };

  const us = (pi, hi, v) => {
    setRound(prev => {
      const u = { ...prev, players: prev.players.map((p, i) => { if (i !== pi) return p; const s = [...p.scores]; s[hi] = v; return { ...p, scores: s }; }) };
      sv("currentRound", u);
      saveCurrentRound(u);
      return u;
    });
  };

  const finish = () => {
    const hc = round.players.map(p => p.scores.filter(s => s != null).length);
    const minHoles = Math.min(...hc);
    const { balances } = calcAll(round.games, round.players);
    const n = round.players.map(p => p.name.split(" ")[0]);
    const summary = minHoles + "/18 holes | " + round.games.length + " game" + (round.games.length !== 1 ? "s" : "");
    const winners = balances.map((b, i) => ({ n: n[i], v: -b })).filter(x => x.v > 0.005).sort((a, b) => b.v - a.v);
    const winText = winners.length > 0 ? "\n\nTop: " + winners.slice(0, 2).map(w => w.n + " " + fmt$(w.v)).join(", ") : "";
    setModal({
      title: "Finish Round?",
      text: summary + winText + "\n\nSave to history?",
      onOk: () => {
        const up = [...rounds, round];
        setRounds(up); sv("rounds", up); saveRound(up);
        setRound(null); clearCurrentRound();
        setModal(null); go("home");
      },
      onNo: () => setModal(null)
    });
  };

  const abandon = () => setModal({
    title: "Abandon Round?",
    text: "All scores and game data will be permanently lost. This cannot be undone.",
    okTxt: "Delete Round", danger: true,
    onOk: () => { setRound(null); clearCurrentRound(); setModal(null); go("home"); },
    onNo: () => setModal(null)
  });

  // Join round by share code
  const handleJoinRound = async (code) => {
    const result = await joinRound(code);
    if (result.error) {
      setModal({ title: 'Error', text: result.error, onOk: () => setModal(null) });
      return;
    }
    setRound(result.round);
    go('score');
  };

  // Tournament handlers
  const handleCreateTournament = async (setupData) => {
    const result = await createTournament({
      name: setupData.name,
      date: setupData.date,
      course: setupData.course,
      teeName: setupData.teeName,
      groups: setupData.groups,
      tournamentGames: setupData.tournamentGames,
      teamConfig: setupData.teamConfig
    });
    if (result.error) {
      setModal({ title: 'Error', text: result.error, onOk: () => setModal(null) });
      return;
    }
    // Fetch the created tournament
    const { tournament: t } = await getTournament(result.code);
    if (t) {
      setTournament(t);
      go('tlobby');
    }
  };

  const handleJoinTournament = (code) => {
    setJoinCode(code);
    go('tjoin');
  };

  const handleJoined = (t, guestInfo) => {
    setTournament(t);
    setTournamentGuest(guestInfo);
    go('tlobby');
  };

  const handleStartTournament = async () => {
    if (!tournament) return;
    const result = await startTournament(tournament.shareCode);
    if (result.error) {
      setModal({ title: 'Error', text: result.error, onOk: () => setModal(null) });
      return;
    }
    setTournament({ ...tournament, status: 'live' });
  };

  const leaveTournament = () => {
    setTournament(null);
    setTournamentGuest(null);
    setJoinCode(null);
    clearActiveTournament();
    clearGuestInfo();
    go('home');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setPg("home");
  };

  // Loading state
  if (session === undefined) {
    return (
      <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: T.dim, fontSize: 15 }}>Loading...</div>
      </div>
    );
  }

  // Not logged in
  if (!session) return <Auth />;

  const isHost = tournament && session && tournament.hostUserId === session.user.id;

  const titles = {
    home: "Golf Tracker", score: "Scoring", bets: "Bets & Settlement",
    players: "Players", courses: "Courses", hist: "History", setup: "Game Setup",
    thub: "Tournament", tsetup: "New Tournament", tlobby: "Tournament Lobby", tjoin: "Join Tournament"
  };

  return (
    <div className="app">
      <div className="hdr">
        {["setup", "score", "bets"].includes(pg) && <button className="hdr-bk" onClick={() => { if (pg === "setup") { setSetup(null); setSetupCourse(null); go("home"); } else go("home"); }}>{"<"}</button>}
        {["thub", "tsetup", "tjoin"].includes(pg) && <button className="hdr-bk" onClick={() => { if (pg === "tsetup" || pg === "tjoin") go("thub"); else go("home"); }}>{"<"}</button>}
        {pg === "tlobby" && <button className="hdr-bk" onClick={leaveTournament}>{"<"}</button>}
        <div><div className="hdr-t">{titles[pg] || "Golf Tracker"}</div>{pg === "score" && round && <div className="hdr-s">{round.course.name}</div>}{pg === "tlobby" && tournament && <div className="hdr-s">{tournament.course.name}</div>}</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {pg === "score" && round && <>
            <button className="btn bp bsm" onClick={finish}>Finish</button>
            <button className="bg" style={{ color: T.red, borderColor: T.red + "33" }} onClick={abandon}>{"x"}</button>
          </>}
          <button className="bg" onClick={logout} style={{ fontSize: 12, color: T.dim }}>Logout</button>
        </div>
      </div>
      {pg === "home" && <Home courses={courses} players={players} selectedCourseId={selectedCourseId} setSelectedCourseId={handleSetSelectedCourse} onStart={(rp, course) => { setSetup(rp); setSetupCourse(course); go("setup"); }} round={round} go={go} onJoinRound={handleJoinRound} />}
      {pg === "players" && <Players players={players} setPlayers={handleSetPlayers} />}
      {pg === "courses" && <Courses courses={courses} setCourses={handleSetCourses} selectedCourseId={selectedCourseId} setSelectedCourseId={handleSetSelectedCourse} />}
      {pg === "setup" && setup && setupCourse && <Setup rp={setup} course={setupCourse} onConfirm={games => {
        const r = {
          id: Date.now().toString(),
          date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
          course: { name: setupCourse.name, city: setupCourse.city },
          players: setup, games,
          shareCode: generateShareCode()
        };
        setRound(r); sv("currentRound", r); saveCurrentRound(r);
        setSetup(null); setSetupCourse(null); go("score");
      }} />}
      {pg === "score" && round && <Scoring round={round} updateScore={us} />}
      {pg === "bets" && round && <Bets round={round} />}
      {pg === "hist" && <Hist rounds={rounds} onLoad={r => { setRound({ ...r }); sv("currentRound", r); go("bets"); }} />}

      {/* Tournament pages */}
      {pg === "thub" && <TournamentHub onCreateNew={() => go('tsetup')} onJoin={handleJoinTournament} />}
      {pg === "tsetup" && <TournamentSetup courses={courses} players={players} selectedCourseId={selectedCourseId} onComplete={handleCreateTournament} />}
      {pg === "tlobby" && <TournamentLobby tournament={tournament} isHost={isHost} onStart={handleStartTournament} onBack={leaveTournament} />}
      {pg === "tjoin" && joinCode && <TournamentJoin code={joinCode} onJoined={handleJoined} onBack={() => go('thub')} />}

      {/* Nav: show tournament nav for tournament pages, regular nav otherwise */}
      {isTournamentPg && pg === "tlobby" ? <TournamentNav pg={pg} go={go} isHost={isHost} /> : !isTournamentPg && <Nav pg={pg} go={go} hr={!!round} />}
      {modal && <Mdl {...modal} />}
    </div>
  );
}
