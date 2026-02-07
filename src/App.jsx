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
  importLocalData
} from './utils/storage';
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
      if (cr) setRound(cr);
      if (sc) setSelectedCourseId(sc);
      else if (c.length > 0) setSelectedCourseId(c[0].id);
    };
    load();
  }, [session]);

  const go = p => setPg(p);

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

  const titles = { home: "Golf Tracker", score: "Scoring", bets: "Bets & Settlement", players: "Players", courses: "Courses", hist: "History", setup: "Game Setup" };

  return (
    <div className="app">
      <div className="hdr">
        {["setup", "score", "bets"].includes(pg) && <button className="hdr-bk" onClick={() => { if (pg === "setup") { setSetup(null); setSetupCourse(null); go("home"); } else go("home"); }}>{"<"}</button>}
        <div><div className="hdr-t">{titles[pg]}</div>{pg === "score" && round && <div className="hdr-s">{round.course.name}</div>}</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {pg === "score" && round && <>
            <button className="btn bp bsm" onClick={finish}>Finish</button>
            <button className="bg" style={{ color: T.red, borderColor: T.red + "33" }} onClick={abandon}>{"x"}</button>
          </>}
          <button className="bg" onClick={logout} style={{ fontSize: 12, color: T.dim }}>Logout</button>
        </div>
      </div>
      {pg === "home" && <Home courses={courses} players={players} selectedCourseId={selectedCourseId} setSelectedCourseId={handleSetSelectedCourse} onStart={(rp, course) => { setSetup(rp); setSetupCourse(course); go("setup"); }} round={round} go={go} />}
      {pg === "players" && <Players players={players} setPlayers={handleSetPlayers} />}
      {pg === "courses" && <Courses courses={courses} setCourses={handleSetCourses} selectedCourseId={selectedCourseId} setSelectedCourseId={handleSetSelectedCourse} />}
      {pg === "setup" && setup && setupCourse && <Setup rp={setup} course={setupCourse} onConfirm={games => {
        const r = {
          id: Date.now().toString(),
          date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
          course: { name: setupCourse.name, city: setupCourse.city },
          players: setup, games
        };
        setRound(r); sv("currentRound", r); saveCurrentRound(r);
        setSetup(null); setSetupCourse(null); go("score");
      }} />}
      {pg === "score" && round && <Scoring round={round} updateScore={us} />}
      {pg === "bets" && round && <Bets round={round} />}
      {pg === "hist" && <Hist rounds={rounds} onLoad={r => { setRound(r); sv("currentRound", r); saveCurrentRound(r); go("bets"); }} />}
      <Nav pg={pg} go={go} hr={!!round} />
      {modal && <Mdl {...modal} />}
    </div>
  );
}
