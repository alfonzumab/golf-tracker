import { useState } from 'react';
import { T, TT } from '../../theme';
import { calcCH, getStrokes } from '../../utils/golf';

const TournamentLobby = ({ tournament, isHost, onStart, onBack, onUpdateTournament }) => {
  const [copied, setCopied] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null); // { groupIdx, playerIdx }
  const [tempIndex, setTempIndex] = useState('');

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
          text: `Join my golf tournament! Code: ${tournament.shareCode}\n\nsettleup-golf.com`,
        });
      } catch {
        // Fallback to copy if share fails
      }
    } else {
      copyCode();
    }
  };

  const totalPlayers = tournament.groups.reduce((sum, g) => sum + g.players.length, 0);

  const startEditIndex = (groupIdx, playerIdx, currentIndex) => {
    setEditingIndex({ groupIdx, playerIdx });
    setTempIndex(currentIndex.toString());
  };

  const saveIndex = () => {
    if (!editingIndex || !onUpdateTournament) return;
    const newIndex = parseFloat(tempIndex);
    if (isNaN(newIndex)) {
      setEditingIndex(null);
      return;
    }

    const updatedGroups = tournament.groups.map((g, gi) => {
      if (gi !== editingIndex.groupIdx) return g;
      return {
        ...g,
        players: g.players.map((p, pi) => {
          if (pi !== editingIndex.playerIdx) return p;
          
          // Recalculate course handicap and stroke holes with new index
          const tee = tournament.teeData;
          const totalPar = tee.pars.reduce((a, b) => a + b, 0);
          const courseHandicap = calcCH(newIndex, tee.slope, tee.rating, totalPar);
          const strokeHoles = getStrokes(courseHandicap, tee.handicaps);
          
          return {
            ...p,
            index: newIndex,
            courseHandicap,
            strokeHoles
          };
        })
      };
    });

    onUpdateTournament({ ...tournament, groups: updatedGroups });
    setEditingIndex(null);
    setTempIndex('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setTempIndex('');
  };

  const moveGroup = (fromIdx, direction) => {
    if (!onUpdateTournament) return;
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= tournament.groups.length) return;

    const updatedGroups = [...tournament.groups];
    [updatedGroups[fromIdx], updatedGroups[toIdx]] = [updatedGroups[toIdx], updatedGroups[fromIdx]];
    
    onUpdateTournament({ ...tournament, groups: updatedGroups });
  };

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

      {/* Ryder Cup: Teams & Matches */}
      {tournament.format === 'rydercup' && tournament.teamConfig ? (
        <div>
          <div className="fx g8 mt10">
            {tournament.teamConfig.teams.map((team, ti) => (
              <div key={ti} className="cd" style={{ flex: 1, borderColor: team.color + '44' }}>
                <div className="ct" style={{ color: team.color }}>{team.name}</div>
                {tournament.groups.flatMap(g => g.players).filter(p => team.playerIds.includes(p.id)).map((p, pi) => (
                  <div key={pi} style={{ fontSize: 14, color: team.color, padding: '4px 0' }}>{p.name}</div>
                ))}
              </div>
            ))}
          </div>

          <div className="fxb mb8 mt10"><span className="pg-title">Matches</span></div>
          {tournament.teamConfig.matches.map((m, mi) => {
            const teamA = tournament.groups.flatMap(g => g.players).filter(p => tournament.teamConfig.teams[0].playerIds.includes(p.id));
            const teamB = tournament.groups.flatMap(g => g.players).filter(p => tournament.teamConfig.teams[1].playerIds.includes(p.id));

            const t1Players = m.t1.map(i => teamA[i]);
            const t2Players = m.t2.map(i => teamB[i]);

            const t1Names = m.type === 'singles' ? t1Players[0]?.name : (t1Players[0]?.name.split(' ')[0] + ' & ' + t1Players[1]?.name.split(' ')[0]);
            const t2Names = m.type === 'singles' ? t2Players[0]?.name : (t2Players[0]?.name.split(' ')[0] + ' & ' + t2Players[1]?.name.split(' ')[0]);

            return (
              <div key={mi} className="cd">
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: T.mut + '33', color: T.dim, marginRight: 8 }}>
                  {m.type === 'bestball' ? 'Best Ball' : 'Singles'}
                </span>
                <div style={{ fontSize: 14, marginTop: 6 }}>
                  <span style={{ color: TT.a, fontWeight: 600 }}>{t1Names}</span>
                  <span style={{ color: T.dim }}> vs </span>
                  <span style={{ color: TT.b, fontWeight: 600 }}>{t2Names}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          {/* Standard: Groups */}
          <div className="fxb mb8 mt10">
            <span className="pg-title">Groups</span>
          </div>
          {tournament.groups.map((g, gi) => (
            <div key={gi} className="t-grp">
              <div className="t-grp-h fxb">
                <span>Group {gi + 1}</span>
                {isHost && tournament.status === 'setup' && tournament.groups.length > 1 && (
                  <div className="fx g4">
                    <button 
                      style={{ background: 'none', border: 'none', color: T.acc, cursor: 'pointer', fontSize: 18, padding: '0 4px' }}
                      onClick={() => moveGroup(gi, 'up')}
                      disabled={gi === 0}
                      title="Move up">
                      ▲
                    </button>
                    <button 
                      style={{ background: 'none', border: 'none', color: T.acc, cursor: 'pointer', fontSize: 18, padding: '0 4px' }}
                      onClick={() => moveGroup(gi, 'down')}
                      disabled={gi === tournament.groups.length - 1}
                      title="Move down">
                      ▼
                    </button>
                  </div>
                )}
              </div>
              {g.players.map((p, pi) => (
                <div key={pi} className="t-grp-p fxb">
                  <span>{p.name}</span>
                  {editingIndex?.groupIdx === gi && editingIndex?.playerIdx === pi ? (
                    <div className="fx g4" style={{ alignItems: 'center' }}>
                      <input 
                        className="inp" 
                        type="number" 
                        step="0.1"
                        style={{ width: '60px', padding: '2px 6px', fontSize: 12 }}
                        value={tempIndex}
                        onChange={e => setTempIndex(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveIndex();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                      />
                      <button 
                        style={{ background: 'none', border: 'none', color: T.acc, cursor: 'pointer', fontSize: 16, padding: 2 }}
                        onClick={saveIndex}
                        title="Save">
                        ✓
                      </button>
                      <button 
                        style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', fontSize: 16, padding: 2 }}
                        onClick={cancelEdit}
                        title="Cancel">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span 
                      style={{ fontSize: 12, color: isHost && tournament.status === 'setup' ? T.acc : T.dim, cursor: isHost && tournament.status === 'setup' ? 'pointer' : 'default' }}
                      onClick={() => isHost && tournament.status === 'setup' && startEditIndex(gi, pi, p.index)}
                      title={isHost && tournament.status === 'setup' ? 'Click to edit' : ''}>
                      ({p.index})
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

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
