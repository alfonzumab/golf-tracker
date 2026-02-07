import { useMemo } from 'react';
import { T } from '../../theme';
import { enrichPlayer } from '../../utils/golf';
import { calcTournamentSkins } from '../../utils/tournamentCalc';

const TournamentBoard = ({ tournament }) => {
  const teeData = tournament.course.tees?.find(t => t.name === tournament.teeName) || tournament.course.tees?.[0];

  const leaderboard = useMemo(() => {
    if (!teeData) return [];
    const all = [];
    tournament.groups.forEach((g, gi) => {
      g.players.forEach(p => {
        const enriched = enrichPlayer(p, teeData);
        const played = p.scores.filter(s => s != null).length;
        const gross = p.scores.filter(s => s != null).reduce((a, b) => a + b, 0);
        const parPlayed = teeData.pars.filter((_, hi) => p.scores[hi] != null).reduce((a, b) => a + b, 0);
        const toPar = gross - parPlayed;
        all.push({ name: p.name, group: gi + 1, gross, toPar, thru: played, ch: enriched.courseHandicap });
      });
    });
    return all.sort((a, b) => {
      if (a.thru === 0 && b.thru === 0) return 0;
      if (a.thru === 0) return 1;
      if (b.thru === 0) return -1;
      return a.toPar - b.toPar || b.thru - a.thru;
    });
  }, [tournament.groups, teeData]);

  if (!teeData) {
    return <div className="pg"><div className="cd"><div className="ct">Missing tee data</div><p style={{ fontSize: 13, color: T.dim }}>This tournament was created before tee data was stored.</p></div></div>;
  }

  return (
    <div className="pg">
      <div className="cd" style={{ textAlign: 'center' }}>
        <div className="ct">{tournament.name}</div>
        <p style={{ fontSize: 14, color: T.dim }}>{tournament.course.name} | {tournament.teeName} tees</p>
      </div>

      <div className="cd">
        <div className="ct">Leaderboard</div>
        <div className="fxb" style={{ padding: '4px 0', borderBottom: `1px solid ${T.bdr}`, marginBottom: 6 }}>
          <div style={{ flex: 2, fontSize: 12, color: T.mut }}>#  Player</div>
          <div style={{ width: 32, fontSize: 12, color: T.mut, textAlign: 'center' }}>Grp</div>
          <div style={{ width: 36, fontSize: 12, color: T.mut, textAlign: 'center' }}>Thru</div>
          <div style={{ width: 40, fontSize: 12, color: T.mut, textAlign: 'center' }}>Grs</div>
          <div style={{ width: 40, fontSize: 12, color: T.mut, textAlign: 'center' }}>+/-</div>
        </div>
        {leaderboard.map((p, i) => (
          <div key={i} className="fxb" style={{ padding: '8px 0', borderBottom: i < leaderboard.length - 1 ? `1px solid ${T.bdr}11` : 'none' }}>
            <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: T.mut, width: 18 }}>{p.thru > 0 ? i + 1 : '-'}.</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
            </div>
            <div style={{ width: 32, fontSize: 13, color: T.dim, textAlign: 'center' }}>{p.group}</div>
            <div style={{ width: 36, fontSize: 13, color: T.dim, textAlign: 'center' }}>{p.thru || '-'}</div>
            <div style={{ width: 40, fontSize: 14, fontWeight: 700, textAlign: 'center' }}>{p.thru > 0 ? p.gross : '-'}</div>
            <div style={{ width: 40, fontSize: 13, fontWeight: 600, textAlign: 'center',
              color: p.toPar < 0 ? T.accB : p.toPar > 0 ? T.red : T.dim }}>
              {p.thru > 0 ? (p.toPar > 0 ? '+' : '') + p.toPar : '-'}
            </div>
          </div>
        ))}
        {leaderboard.length === 0 && <div style={{ fontSize: 13, color: T.dim, textAlign: 'center', padding: 12 }}>No scores yet</div>}
      </div>

      {/* Tournament Skins */}
      {(() => {
        const skinsConfig = tournament.tournamentGames?.find(g => g.type === 'skins');
        if (!skinsConfig) return null;
        const allPlayers = [];
        tournament.groups.forEach((g, gi) => {
          g.players.forEach(p => allPlayers.push({ ...enrichPlayer(p, teeData), groupIdx: gi }));
        });
        const sr = calcTournamentSkins(skinsConfig, allPlayers);
        return (
          <div className="cd">
            <div className="ct">Tournament Skins</div>
            <div className="fxb mb6">
              <span style={{ fontSize: 13, color: T.dim }}>Pot: ${sr.pot}</span>
              <span style={{ fontSize: 13, color: T.dim }}>{sr.totalSkins} skin{sr.totalSkins !== 1 ? "s" : ""}{sr.carry > 0 ? ` (${sr.carry} carrying)` : ""}</span>
            </div>
            {sr.totalSkins > 0 && <div style={{ fontSize: 12, color: T.dim, marginBottom: 8 }}>${sr.perSkin.toFixed(2)}/skin | {skinsConfig.net ? "Net" : "Gross"}{skinsConfig.carryOver ? " | Carry" : ""}</div>}
            <div className="fxb" style={{ padding: '4px 0', borderBottom: `1px solid ${T.bdr}`, marginBottom: 4 }}>
              <div style={{ flex: 2, fontSize: 12, color: T.mut }}>Player</div>
              <div style={{ width: 32, fontSize: 12, color: T.mut, textAlign: 'center' }}>Grp</div>
              <div style={{ width: 44, fontSize: 12, color: T.mut, textAlign: 'center' }}>Skins</div>
              <div style={{ width: 56, fontSize: 12, color: T.mut, textAlign: 'right' }}>P&L</div>
            </div>
            {sr.playerResults.map((p, i) => (
              <div key={i} className="fxb" style={{ padding: '6px 0', borderBottom: `1px solid ${T.bdr}11` }}>
                <div style={{ flex: 2, fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                <div style={{ width: 32, fontSize: 13, color: T.dim, textAlign: 'center' }}>{p.groupIdx + 1}</div>
                <div style={{ width: 44, fontSize: 14, fontWeight: 700, textAlign: 'center' }}>{p.skins}</div>
                <div style={{ width: 56, fontSize: 13, fontWeight: 600, textAlign: 'right',
                  color: p.netPL > 0.01 ? T.accB : p.netPL < -0.01 ? T.red : T.dim }}>{p.netPLStr}</div>
              </div>
            ))}
            {sr.totalSkins === 0 && <div style={{ fontSize: 13, color: T.dim, textAlign: 'center', padding: 8 }}>No skins awarded yet</div>}
          </div>
        );
      })()}

      {tournament.groups.map((g, gi) => (
        <div key={gi} className="cd">
          <div className="ct">Group {gi + 1}</div>
          {g.players.map((p, pi) => {
            const played = p.scores.filter(s => s != null).length;
            const gross = p.scores.filter(s => s != null).reduce((a, b) => a + b, 0);
            return (
              <div key={pi} className="fxb" style={{ padding: '6px 0' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontSize: 13, color: T.dim }}>{played > 0 ? `${gross} (${played} holes)` : 'Not started'}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default TournamentBoard;
