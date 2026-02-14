const ICN={home:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>,
score:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
bets:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
players:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
courses:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
hist:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
profile:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>};

const Nav = ({ pg, go, hr }) => (
  <div className="nav">
    <button className={`ni ${pg === "home" ? "on" : ""}`} onClick={() => go("home")}><span className="nii">{ICN.home}</span>Home</button>
    {hr && <button className={`ni ${pg === "score" ? "on" : ""}`} onClick={() => go("score")}><span className="nii">{ICN.score}</span>Score</button>}
    {hr && <button className={`ni ${pg === "bets" ? "on" : ""}`} onClick={() => go("bets")}><span className="nii">{ICN.bets}</span>Bets</button>}
    <button className={`ni ${pg === "players" ? "on" : ""}`} onClick={() => go("players")}><span className="nii">{ICN.players}</span>Players</button>
    <button className={`ni ${pg === "courses" ? "on" : ""}`} onClick={() => go("courses")}><span className="nii">{ICN.courses}</span>Courses</button>
    <button className={`ni ${pg === "hist" ? "on" : ""}`} onClick={() => go("hist")}><span className="nii">{ICN.hist}</span>History</button>
    <button className={`ni ${pg === "profile" ? "on" : ""}`} onClick={() => go("profile")}><span className="nii">{ICN.profile}</span>Profile</button>
  </div>
);

export default Nav;
