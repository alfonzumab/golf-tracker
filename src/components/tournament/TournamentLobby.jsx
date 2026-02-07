import { useState } from 'react';
import { T } from '../../theme';

const TournamentLobby = ({ tournament, isHost, onStart, onBack }) => {
  const [copied, setCopied] = useState(false);
  const [showLeave, setShowLeave] = useState(false);

  if (!tournament) return null;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(tournament.shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = tournament.shareCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tournament.name,
          text: `Join my golf tournament! Code: ${tournament.shareCode}`,
        });
      } catch {}
    } else {
      copyCode();
    }
  };

  const totalPlayers = tournament.groups.reduce((sum, g) => sum + g.players.length, 0);

  return (
    <div className="pg">
      <div className="cd" style={{ textAlign: 'center' }}>
        <div className="ct">{tournament.name}</div>
        <p style={{ fontSize: 14, color: T.dim, marginBottom: 4 }}>{tournament.course.name}</p>
        <p style={{ fontSize: 13, color: T.dim, marginBottom: 16 }}>{tournament.date} | {totalPlayers} players | {tournament.groups.length} groups</p>

        <div className={`t-status ${tournament.status}`} style={{ marginBottom: 16 }}>
          {tournament.status === 'setup' ? 'Setting Up' : tournament.status === 'live' ? 'Live' : 'Finished'}
        </div>
      </div>

      {/* Share Code */}
      <div className="cd">
        <div className="ct" style={{ textAlign: 'center' }}>Share Code</div>
        <div className="t-code-box">
          <div className="t-code">{tournament.shareCode}</div>
          <div className="t-code-label">Share this code with other players</div>
        </div>
        <div className="t-share-btns">
          <button className="btn bs" onClick={copyCode}>{copied ? 'Copied!' : 'Copy Code'}</button>
          <button className="btn bp" onClick={share}>Share</button>
        </div>
      </div>

      {/* Groups */}
      <div className="fxb mb8 mt10">
        <span className="pg-title">Groups</span>
      </div>
      {tournament.groups.map((g, gi) => (
        <div key={gi} className="t-grp">
          <div className="t-grp-h">Group {gi + 1}</div>
          {g.players.map((p, pi) => (
            <div key={pi} className="t-grp-p">
              {p.name} <span style={{ fontSize: 12, color: T.dim }}>({p.index})</span>
            </div>
          ))}
        </div>
      ))}

      {/* Actions */}
      {isHost && tournament.status === 'setup' && (
        <button className="btn bp mt10" style={{ fontSize: 16, padding: 16 }} onClick={onStart}>
          Start Tournament {">"}
        </button>
      )}

      {!isHost && tournament.status === 'setup' && (
        <div className="cd" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: T.dim }}>Waiting for host to start the tournament...</p>
        </div>
      )}

      <button className="btn bg mt8" style={{ color: T.red, borderColor: T.red + '33' }} onClick={() => setShowLeave(true)}>{"<"} Leave Lobby</button>

      {showLeave && <div className="mbg" onClick={() => setShowLeave(false)}>
        <div className="mdl" onClick={e => e.stopPropagation()}>
          <div className="mdt">Leave Tournament?</div>
          <p style={{ fontSize: 14, color: T.dim, marginBottom: 16 }}>You will no longer see this tournament. You can rejoin later with the share code: <strong style={{ color: T.accB }}>{tournament.shareCode}</strong></p>
          <div className="fx g8">
            <button className="btn bs" onClick={() => setShowLeave(false)}>Cancel</button>
            <button className="btn bp" style={{ background: T.red }} onClick={onBack}>Leave</button>
          </div>
        </div>
      </div>}
    </div>
  );
};

export default TournamentLobby;
