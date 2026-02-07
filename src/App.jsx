import { useState } from 'react';
import './styles.css';
import { T } from './theme';
import { sv, ld } from './utils/storage';
import { calcAll } from './utils/calc';
import { fmt$ } from './utils/golf';
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
  const [pg, setPg] = useState("home");
  const [players, setPlayers] = useState(() => ld("players", []));
  const [courses, setCourses] = useState(() => ld("courses", []));
  const [selectedCourseId, setSelectedCourseId] = useState(() => ld("selectedCourse", courses[0]?.id || null));
  const [round, setRound] = useState(() => ld("currentRound", null));
  const [rounds, setRounds] = useState(() => ld("rounds", []));
  const [setup, setSetup] = useState(null);
  const [setupCourse, setSetupCourse] = useState(null);
  const [modal, setModal] = useState(null);

  const go = p => setPg(p);
  const us = (pi, hi, v) => {
    setRound(prev => {
      const u = { ...prev, players: prev.players.map((p, i) => { if (i !== pi) return p; const s = [...p.scores]; s[hi] = v; return { ...p, scores: s }; }) };
      sv("currentRound", u);
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
        const up = [...rounds, round]; setRounds(up); sv("rounds", up);
        setRound(null); sv("currentRound", null); setModal(null); go("home");
      },
      onNo: () => setModal(null)
    });
  };

  const abandon = () => setModal({
    title: "Abandon Round?",
    text: "All scores and game data will be permanently lost. This cannot be undone.",
    okTxt: "Delete Round", danger: true,
    onOk: () => { setRound(null); sv("currentRound", null); setModal(null); go("home"); },
    onNo: () => setModal(null)
  });

  const titles = { home: "Golf Tracker", score: "Scoring", bets: "Bets & Settlement", players: "Players", courses: "Courses", hist: "History", setup: "Game Setup" };

  return (
    <div className="app">
      <div className="hdr">
        {["setup", "score", "bets"].includes(pg) && <button className="hdr-bk" onClick={() => { if (pg === "setup") { setSetup(null); setSetupCourse(null); go("home"); } else go("home"); }}>{"<"}</button>}
        <div><div className="hdr-t">{titles[pg]}</div>{pg === "score" && round && <div className="hdr-s">{round.course.name}</div>}</div>
        {pg === "score" && round && <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="btn bp bsm" onClick={finish}>Finish</button>
          <button className="bg" style={{ color: T.red, borderColor: T.red + "33" }} onClick={abandon}>{"x"}</button>
        </div>}
      </div>
      {pg === "home" && <Home courses={courses} players={players} selectedCourseId={selectedCourseId} setSelectedCourseId={setSelectedCourseId} onStart={(rp, course) => { setSetup(rp); setSetupCourse(course); go("setup"); }} round={round} go={go} />}
      {pg === "players" && <Players players={players} setPlayers={setPlayers} />}
      {pg === "courses" && <Courses courses={courses} setCourses={setCourses} selectedCourseId={selectedCourseId} setSelectedCourseId={setSelectedCourseId} />}
      {pg === "setup" && setup && setupCourse && <Setup rp={setup} course={setupCourse} onConfirm={games => {
        const r = {
          id: Date.now().toString(),
          date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
          course: { name: setupCourse.name, city: setupCourse.city },
          players: setup, games
        };
        setRound(r); sv("currentRound", r); setSetup(null); setSetupCourse(null); go("score");
      }} />}
      {pg === "score" && round && <Scoring round={round} updateScore={us} />}
      {pg === "bets" && round && <Bets round={round} />}
      {pg === "hist" && <Hist rounds={rounds} onLoad={r => { setRound(r); sv("currentRound", r); go("bets"); }} />}
      <Nav pg={pg} go={go} hr={!!round} />
      {modal && <Mdl {...modal} />}
    </div>
  );
}
