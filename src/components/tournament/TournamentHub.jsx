import { useState } from 'react';
import { T } from '../../theme';

const TournamentHub = ({ onCreateNew, onJoin }) => {
  const [code, setCode] = useState('');

  return (
    <div className="pg">
      <div className="cd">
        <div className="ct">Tournament Mode</div>
        <p style={{ fontSize: 14, color: T.dim, marginBottom: 16 }}>
          Multiple foursomes, cross-group skins, leaderboards, and Ryder Cup teams.
        </p>
        <div className="t-hub">
          <button className="btn bp" style={{ fontSize: 16, padding: 16 }} onClick={onCreateNew}>
            Create Tournament
          </button>
          <div className="t-or">or</div>
          <div>
            <div className="il mb6">Join with Share Code</div>
            <input
              className="t-code-inp mb10"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ABC123"
              maxLength={6}
            />
            <button
              className="btn bs"
              disabled={code.length !== 6}
              onClick={() => onJoin(code)}
            >
              Join Tournament
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentHub;
