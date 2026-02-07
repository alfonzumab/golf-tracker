import { useMemo } from 'react';
import { T } from '../../theme';
import { enrichPlayer } from '../../utils/golf';

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
