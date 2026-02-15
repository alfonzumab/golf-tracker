import { useState, useEffect, useRef } from 'react';
import './styles.css';
import { T } from './theme';
import { supabase } from './lib/supabase';
import {
  sv, ld,
  loadPlayers, savePlayersFavorites, savePlayers,
  loadCourses, saveCourses,
  loadRounds, saveRound,
  loadCurrentRound, saveCurrentRound, clearCurrentRound,
  loadSelectedCourse, saveSelectedCourse,
  loadProfile,
  joinRound, generateShareCode,
  finishRound, registerRoundParticipant, reopenRound
} from './utils/storage';
import { createTournament, getTournament, saveTournamentSetup, startTournament, finishTournament, updateTournamentScore, updateGroupGames, loadActiveTournament, clearActiveTournament, loadGuestInfo, saveGuestInfo, clearGuestInfo, registerTournamentParticipant, loadTournamentHistory, reopenTournament } from './utils/tournamentStorage';
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
import Hist from './components/History';
import Profile from './components/Profile';
import TournamentHub from './components/tournament/TournamentHub';
import TournamentSetup from './components/tournament/TournamentSetup';
import TournamentLobby from './components/tournament/TournamentLobby';
import TournamentJoin from './components/tournament/TournamentJoin';
import TournamentNav from './components/tournament/TournamentNav';
import TournamentScore from './components/tournament/TournamentScore';
import TournamentBoard from './components/tournament/TournamentBoard';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out
  const [profile, setProfile] = useState(null);
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
  const [tournamentHistory, setTournamentHistory] = useState([]);
  const [viewingFinishedTournament, setViewingFinishedTournament] = useState(false);

  // Track when local scores were last updated to avoid poll overwriting them
  const lastScoreUpdate = useRef(0);

  // Listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data from Supabase when logged in (once per sign-in, skip token refreshes)
  const dataLoaded = useRef(false);
  const tournamentStartedRef = useRef(false);
  useEffect(() => {
    if (!session) { dataLoaded.current = false; return; }
    if (dataLoaded.current) return;
    dataLoaded.current = true;
    const load = async () => {
      const [prof, p, c, r, cr, sc] = await Promise.all([
        loadProfile(), loadPlayers(), loadCourses(), loadRounds(), loadCurrentRound(), loadSelectedCourse()
      ]);
      setProfile(prof);
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
      } else {
        setRound(null);
      }
      if (sc) setSelectedCourseId(sc);
      else if (c.length > 0) setSelectedCourseId(c[0].id);

      // Auto-resume active tournament
      const activeCode = loadActiveTournament();
      if (activeCode) {
        try {
          const { tournament: t } = await getTournament(activeCode);
          if (t) {
            setTournament(t);
            tournamentStartedRef.current = t.status === 'live';
            const guest = loadGuestInfo();
            if (guest) setTournamentGuest(guest);
          }
        } catch {
          // Silently handle network errors
        }
      }

      // Load tournament history
      const th = await loadTournamentHistory();
      setTournamentHistory(th);
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
          // If a local score was just entered, skip this poll to avoid overwriting it
          // (saveCurrentRound debounces writes by 1500ms, so give 3s buffer)
          const timeSinceLastUpdate = Date.now() - lastScoreUpdate.current;
          if (timeSinceLastUpdate < 3000) return;
          setRound(prev => {
            if (!prev) return cr;
            // Merge: keep local player scores if they have more data than remote
            // This prevents stale poll data from reverting a just-entered score
            const mergedPlayers = cr.players.map((rp, i) => {
              if (!prev.players[i]) return rp;
              const localScored = prev.players[i].scores.filter(s => s != null).length;
              const remoteScored = rp.scores.filter(s => s != null).length;
              // If local has same or more scores, keep local scores
              if (localScored >= remoteScored) return { ...rp, scores: prev.players[i].scores };
              return rp;
            });
            const merged = { ...cr, players: mergedPlayers };
            sv('currentRound', merged);
            return merged;
          });
        } else if (data && data.length === 0) {
          // Round was finished/abandoned on another device — clear local state and reload history
          setRound(prev => {
            if (prev) {
              sv('currentRound', null);
              // Reload history to pick up the finished round
              loadRounds().then(r => { setRounds(r); sv('rounds', r); });
            }
            return null;
          });
        }
      } catch {
        // Silently handle network errors
      }
    }, 10000);
    return () => clearInterval(id);
  }, [session]);

  // Poll for global player/course changes every 60s
  useEffect(() => {
    if (!session) return;
    const id = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const [p, c] = await Promise.all([loadPlayers(), loadCourses()]);
        setPlayers(p);
        setCourses(c);
      } catch {
        // Silently handle network errors
      }
    }, 60000);
    return () => clearInterval(id);
  }, [session]);

  const go = p => setPg(p);
  const isTournamentPg = pg.startsWith('t');

  // Handle player changes - all authenticated users can save
  const handleSetPlayers = async (up) => {
    setPlayers(up);
    sv("players", up);
    // All users can save players to Supabase
    console.log('Saving players to Supabase...');
    try {
      await savePlayers(up);
      console.log('Players saved successfully');
    } catch (error) {
      console.error('Failed to save players:', error);
    }
    // Save favorites for all users
    const favoriteIds = up.filter(p => p.favorite).map(p => p.id);
    console.log('handleSetPlayers: Calling savePlayersFavorites with:', favoriteIds);
    await savePlayersFavorites(favoriteIds);
    console.log('handleSetPlayers: savePlayersFavorites completed');
  };

  // Handle course changes - all authenticated users can save
  const handleSetCourses = (up) => {
    setCourses(up);
    sv("courses", up);
    // All users can save courses to Supabase
    console.log('Saving courses to Supabase...');
    saveCourses(up);
  };

  const handleSetSelectedCourse = (id) => { setSelectedCourseId(id); sv("selectedCourse", id); saveSelectedCourse(id); };

  const us = (pi, hi, v) => {
    lastScoreUpdate.current = Date.now();
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
      onOk: async () => {
        try {
          // Call finish_round RPC to save copies for all participants
          await finishRound(round.id, round.shareCode);
          // Update local state immediately for instant UI
          const up = [...rounds, round];
          setRounds(up); sv("rounds", up); saveRound(up);
          setRound(null); clearCurrentRound();
          setModal(null); go("home");
        } catch (error) {
          setModal({ title: 'Error', text: 'Failed to finish round: ' + error.message, onOk: () => setModal(null) });
        }
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
    try {
      const result = await createTournament({
        name: setupData.name,
        date: setupData.date,
        course: setupData.course,
        teeName: setupData.teeName,
        groups: setupData.groups,
        tournamentGames: setupData.tournamentGames,
        teamConfig: setupData.teamConfig,
        format: setupData.format
      });
      if (result.error) {
        setModal({ title: 'Error', text: result.error, onOk: () => setModal(null) });
        return;
      }
      const { tournament: t, error: fetchErr } = await getTournament(result.code);
      if (fetchErr) {
        setModal({ title: 'Error', text: fetchErr, onOk: () => setModal(null) });
        return;
      }
      if (t) {
        setTournament(t);
        setViewingFinishedTournament(false);
        tournamentStartedRef.current = t.status === 'live';
        // Register host as participant
        registerTournamentParticipant(t.id);
        go('tlobby');
      } else {
        setModal({ title: 'Error', text: 'Tournament created but could not be loaded. Check Supabase RPC.', onOk: () => setModal(null) });
      }
    } catch (e) {
      setModal({ title: 'Error', text: e.message || 'Unknown error creating tournament', onOk: () => setModal(null) });
    }
  };

  const handleJoinTournament = (code) => {
    setJoinCode(code);
    go('tjoin');
  };

  const handleJoined = (t, guestInfo) => {
    setTournament(t);
    setViewingFinishedTournament(false);
    tournamentStartedRef.current = t.status === 'live';
    setTournamentGuest(guestInfo);
    // Register participant
    registerTournamentParticipant(t.id, guestInfo?.groupIdx, guestInfo?.playerIdx);
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
    go('tscore');
  };

  const leaveTournament = () => {
    setTournament(null);
    setTournamentGuest(null);
    setJoinCode(null);
    setViewingFinishedTournament(false);
    clearActiveTournament();
    clearGuestInfo();
    go('home');
  };

  // Tournament score update
  const handleTournamentScoreUpdate = (groupIdx, playerIdx, holeIdx, score) => {
    setTournament(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        groups: prev.groups.map((g, gi) => {
          if (gi !== groupIdx) return g;
          return { ...g, players: g.players.map((p, pi) => {
            if (pi !== playerIdx) return p;
            const s = [...p.scores]; s[holeIdx] = score; return { ...p, scores: s };
          }) };
        })
      };
    });
    if (tournament) updateTournamentScore(tournament.shareCode, groupIdx, playerIdx, holeIdx, score);
  };

  const handleUpdateGroupGames = (groupIdx, games) => {
    setTournament(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        groups: prev.groups.map((g, gi) => gi === groupIdx ? { ...g, games } : g)
      };
    });
    if (tournament) updateGroupGames(tournament.shareCode, groupIdx, games);
  };

  const handleUpdateTournament = async (updatedTournament) => {
    // Update local state immediately for instant UI feedback
    setTournament(updatedTournament);

    // Persist to Supabase
    const result = await saveTournamentSetup(updatedTournament);
    if (result.error) {
      console.error('Failed to update tournament:', result.error);
    }
  };

  const handleSelectTournamentPlayer = (info) => {
    setTournamentGuest(info);
    saveGuestInfo(info);
  };

  // Reopen a finished round
  const handleReopenRound = async (r) => {
    try {
      await reopenRound(r.id);
      // Set as active round
      setRound({ ...r });
      sv('currentRound', r);
      saveCurrentRound(r);
      // Remove from local history
      const filtered = rounds.filter(rd => rd.id !== r.id);
      setRounds(filtered);
      sv('rounds', filtered);
      saveRound(filtered);
      go('score');
    } catch (error) {
      setModal({ title: 'Error', text: 'Failed to reopen round: ' + error.message, onOk: () => setModal(null) });
    }
  };

  // Finish active tournament
  const handleFinishTournament = () => {
    if (!tournament) return;
    setModal({
      title: 'Finish Tournament?',
      text: `${tournament.name}\n\nThis will end the tournament for all participants and move it to history.`,
      onOk: async () => {
        try {
          await finishTournament(tournament.shareCode);
          // Move to history
          setTournamentHistory(prev => [...prev, tournament]);
          // Clear active tournament
          setTournament(null);
          setTournamentGuest(null);
          setViewingFinishedTournament(false);
          clearActiveTournament();
          clearGuestInfo();
          setModal(null);
          go('home');
        } catch (error) {
          setModal({ title: 'Error', text: 'Failed to finish tournament: ' + error.message, onOk: () => setModal(null) });
        }
      },
      onNo: () => setModal(null)
    });
  };

  // Reopen a finished tournament
  const handleReopenTournament = async (t) => {
    try {
      await reopenTournament(t.shareCode);
      // Set as active tournament
      setTournament({ ...t, status: 'live' });
      setViewingFinishedTournament(false);
      // Remove from tournament history
      const filtered = tournamentHistory.filter(th => th.id !== t.id);
      setTournamentHistory(filtered);
      // Save active tournament code
      sv('active-tournament', t.shareCode);
      go('tscore');
    } catch (error) {
      setModal({ title: 'Error', text: 'Failed to reopen tournament: ' + error.message, onOk: () => setModal(null) });
    }
  };

  // Poll tournament data every 10s when live
  useEffect(() => {
    if (!tournament || tournament.status !== 'live') return;
    const code = tournament.shareCode;
    const myGroup = tournamentGuest?.groupIdx;
    const id = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { tournament: fresh } = await getTournament(code);
        if (fresh) {
          // If tournament was finished by host, move to history
          if (fresh.status === 'finished') {
            setTournamentHistory(prev => [...prev, fresh]);
            setTournament(null);
            setTournamentGuest(null);
            clearActiveTournament();
            clearGuestInfo();
            return;
          }
          setTournament(prev => {
            if (!prev) return fresh;
            // Keep local scores for user's group, update others from server
            return {
              ...fresh,
              groups: fresh.groups.map((g, gi) => gi === myGroup ? { ...g, players: prev.groups[gi].players } : g)
            };
          });
        }
      } catch {
        // Silently handle network errors
      }
    }, 10000);
    return () => clearInterval(id);
  }, [tournament, tournamentGuest?.groupIdx]);

  // Auto-navigate to scoring when tournament first goes live (but allow manual navigation to lobby)
  useEffect(() => {
    if (tournament?.status === 'live' && pg === 'tlobby' && !tournamentStartedRef.current) {
      tournamentStartedRef.current = true;
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => setPg('tscore'), 0);
    }
  }, [tournament, pg]);

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setPg("home");
  };

  // Handle profile updates
  const handleUpdateProfile = async (updates) => {
    setProfile(prev => ({ ...prev, ...updates }));
    
    // If handicap_index was updated and user has a linked player, sync it to the players list
    if (updates.handicap_index !== undefined && profile?.linked_player_id) {
      const linkedPlayerId = profile.linked_player_id;
      const updatedPlayers = players.map(p => 
        p.id === linkedPlayerId 
          ? { ...p, index: updates.handicap_index } 
          : p
      );
      
      // Only update if the player was actually found and changed
      if (updatedPlayers.some((p, i) => p.id === linkedPlayerId && p.index !== players[i].index)) {
        await handleSetPlayers(updatedPlayers);
      }
    }
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
    home: "Settle Up Golf", score: "Scoring",
    players: "Players", courses: "Courses", hist: "History", setup: "Game Setup",
    thub: "Tournament", tsetup: "New Tournament", tlobby: "Tournament Lobby", tjoin: "Join Tournament",
    tscore: "Scoring", tboard: "Leaderboard", profile: "Profile"
  };

  return (
    <div className="app">
      <div className="hdr">
        {["setup", "score", "bets", "profile"].includes(pg) && <button className="hdr-bk" onClick={() => { if (pg === "setup") { setSetup(null); setSetupCourse(null); go("home"); } else if (pg === "profile") { go("home"); } else go("home"); }}>{"<"}</button>}
        {["thub", "tsetup", "tjoin"].includes(pg) && <button className="hdr-bk" onClick={() => { if (pg === "tsetup" || pg === "tjoin") go("thub"); else go("home"); }}>{"<"}</button>}
        {["tlobby", "tscore", "tboard"].includes(pg) && <button className="hdr-bk" onClick={() => go('home')}>{"<"}</button>}
        <div><div className="hdr-t">{titles[pg] || "Settle Up Golf"}</div>{pg === "score" && round && <div className="hdr-s">{round.course.name}</div>}{["tlobby", "tscore", "tboard"].includes(pg) && tournament && <div className="hdr-s">{tournament.course.name}</div>}</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {pg === "score" && round && <>
            <button className="btn bp bsm" onClick={finish}>Finish</button>
            <button className="bg" style={{ color: T.red, borderColor: T.red + "33" }} onClick={abandon}>{"x"}</button>
          </>}
        </div>
      </div>
      {pg === "home" && <Home courses={courses} players={players} rounds={rounds} selectedCourseId={selectedCourseId} setSelectedCourseId={handleSetSelectedCourse} onStart={(rp, course) => { setSetup(rp); setSetupCourse(course); go("setup"); }} round={round} go={go} onJoinRound={handleJoinRound} tournament={tournament} onLeaveTournament={leaveTournament} />}
      {pg === "players" && <Players players={players} setPlayers={handleSetPlayers} />}
      {pg === "courses" && <Courses courses={courses} setCourses={handleSetCourses} selectedCourseId={selectedCourseId} setSelectedCourseId={handleSetSelectedCourse} />}
      {pg === "setup" && setup && setupCourse && <Setup rp={setup} course={setupCourse} onConfirm={(games, updatedPlayers) => {
        const r = {
          id: Date.now().toString(),
          date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
          course: { name: setupCourse.name, city: setupCourse.city },
          players: updatedPlayers || setup, games,
          shareCode: generateShareCode()
        };
        setRound(r); sv("currentRound", r); saveCurrentRound(r);
        // Register host as participant
        registerRoundParticipant(r.id);
        setSetup(null); setSetupCourse(null); go("score");
      }} />}
      {pg === "score" && round && <Scoring round={round} updateScore={us} />}
      {pg === "hist" && <Hist
        rounds={rounds}
        tournamentHistory={tournamentHistory}
        onLoad={r => { setRound({ ...r }); sv("currentRound", r); go("score"); }}
        onReopenRound={handleReopenRound}
        onReopenTournament={handleReopenTournament}
        isHost={(t) => t && session && t.hostUserId === session.user.id}
        onViewTournament={(t) => { setTournament(t); setViewingFinishedTournament(true); go('tboard'); }}
      />}
      {pg === "profile" && <Profile session={session} profile={profile} courses={courses} players={players} onLogout={logout} onUpdateProfile={handleUpdateProfile} />}

      {/* Tournament pages */}
      {pg === "thub" && <TournamentHub onCreateNew={() => go('tsetup')} onJoin={handleJoinTournament} />}
      {pg === "tsetup" && <TournamentSetup courses={courses} players={players} selectedCourseId={selectedCourseId} onComplete={handleCreateTournament} />}
      {pg === "tlobby" && <TournamentLobby tournament={tournament} isHost={isHost} onStart={handleStartTournament} onBack={leaveTournament} onUpdateTournament={handleUpdateTournament} />}
      {pg === "tjoin" && joinCode && <TournamentJoin code={joinCode} onJoined={handleJoined} onBack={() => go('thub')} />}
      {pg === "tscore" && tournament && <TournamentScore tournament={tournament} playerInfo={tournamentGuest} onUpdateScore={handleTournamentScoreUpdate} onSelectPlayer={handleSelectTournamentPlayer} onUpdateGroupGames={handleUpdateGroupGames} />}
      {pg === "tboard" && tournament && <TournamentBoard tournament={tournament} isHost={isHost} onFinish={handleFinishTournament} readOnly={viewingFinishedTournament} />}

      {/* Nav: show tournament nav for tournament pages, regular nav otherwise */}
      {["tlobby", "tscore", "tboard"].includes(pg) ? <TournamentNav pg={pg} go={go} /> : !isTournamentPg && <Nav pg={pg} go={go} hr={!!round} />}
      {modal && <Mdl {...modal} />}
    </div>
  );
}
