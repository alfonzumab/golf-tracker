import { useState } from 'react';
import { T } from '../../theme';
import { getTournament, saveGuestInfo, saveActiveTournament } from '../../utils/tournamentStorage';

const TournamentJoin = ({ code, profile, onJoined, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const fetchTournament = async () => {
    setLoading(true);
    setError(null);
    const result = await getTournament(code);
    if (result.error) {
      setError(result.error);
    } else {
      setTournament(result.tournament);
    }
    setLoading(false);
  };

  // Auto-fetch on mount
  if (!tournament && !loading && !error) {
    fetchTournament();
  }

  // Auto-select linked player when tournament loads (no setState in effect)
  if (tournament && profile?.linked_player_id && selectedGroup === null && selectedPlayer === null) {
    for (let groupIdx = 0; groupIdx < tournament.groups.length; groupIdx++) {
      const group = tournament.groups[groupIdx];
      const playerIdx = group.players.findIndex(p => p.id === profile.linked_player_id);
      if (playerIdx !== -1) {
        const guestInfo = {
          code: tournament.shareCode,
          groupIdx,
          playerIdx,
          playerName: group.players[playerIdx].name,
          tournamentName: tournament.name
        };
        saveGuestInfo(guestInfo);
        saveActiveTournament(tournament.shareCode);
        onJoined(tournament, guestInfo);
      }
    }
  }

  const confirmJoin = () => {
    if (selectedGroup === null || selectedPlayer === null) return;
    const guestInfo = {
      code: tournament.shareCode,
      groupIdx: selectedGroup,
      playerIdx: selectedPlayer,
      playerName: tournament.groups[selectedGroup].players[selectedPlayer].name,
      tournamentName: tournament.name
    };
    saveGuestInfo(guestInfo);
    saveActiveTournament(tournament.shareCode);
    onJoined(tournament, guestInfo);
  };

  if (loading) {
    return (
      <div className="pg">
        <div className="cd" style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ color: T.dim }}>Finding tournament...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pg">
        <div className="cd" style={{ textAlign: 'center' }}>
          <div className="auth-err mb10">{error}</div>
          <button className="btn bs" onClick={onBack}>{"<"} Back</button>
        </div>
      </div>
    );
  }

  if (!tournament) return null;

  return (
    <div className="pg">
      <div className="cd">
        <div className="ct">{tournament.name}</div>
        <p style={{ fontSize: 14, color: T.dim, marginBottom: 4 }}>{tournament.course.name}</p>
        <p style={{ fontSize: 13, color: T.dim }}>{tournament.date}</p>
      </div>

      <div className="cd">
        <div className="ct">Which player are you?</div>
        <p style={{ fontSize: 13, color: T.dim, marginBottom: 12 }}>Select your group and name to sync scoring.</p>

        {tournament.groups.map((g, gi) => (
          <div key={gi} className="t-grp">
            <div className="t-grp-h">Group {gi + 1}</div>
            {g.players.map((p, pi) => {
              const isSel = selectedGroup === gi && selectedPlayer === pi;
              return (
                <div key={pi} onClick={() => { setSelectedGroup(gi); setSelectedPlayer(pi); }}
                  style={{
                    padding: '10px 12px', borderRadius: 8, marginBottom: 4, cursor: 'pointer',
                    background: isSel ? T.accD + '33' : 'transparent',
                    border: `1.5px solid ${isSel ? T.acc : 'transparent'}`,
                    transition: 'all .15s'
                  }}>
                  <span style={{ fontSize: 15, fontWeight: isSel ? 700 : 400, color: isSel ? T.accB : T.txt }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: T.dim, marginLeft: 8 }}>Idx {p.index}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <button className="btn bp" disabled={selectedGroup === null || selectedPlayer === null} onClick={confirmJoin}>
        Join as {selectedGroup !== null && selectedPlayer !== null ? tournament.groups[selectedGroup].players[selectedPlayer].name : '...'} {">"}
      </button>
      <button className="btn bg mt8" onClick={onBack}>{"<"} Back</button>
    </div>
  );
};

export default TournamentJoin;
