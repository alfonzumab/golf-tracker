import { useState } from 'react';
import { T } from '../theme';

const Players = ({ players, setPlayers }) => {
  const [sa, setSa] = useState(false);
  const [nm, setNm] = useState("");
  const [ix, setIx] = useState("");
  const [edit, setEdit] = useState(null);

  const add = () => {
    if (!nm.trim()) return;
    const up = [...players, { id: crypto.randomUUID(), name: nm.trim(), index: parseFloat(ix) || 0 }];
    setPlayers(up); setNm(""); setIx(""); setSa(false);
  };

  const rm = (id, name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    const up = players.filter(p => p.id !== id);
    setPlayers(up);
  };

  const saveEdit = () => {
    if (!edit || !edit.name.trim()) return;
    const up = players.map(p => p.id === edit.id ? { ...p, name: edit.name.trim(), index: parseFloat(edit.index) || 0 } : p);
    setPlayers(up); setEdit(null);
  };

  return (
    <div className="pg">
      <div className="fxb mb10">
        <span className="pg-title">Players</span>
        <button className="btn bp bsm" onClick={() => setSa(true)}>+ Add</button>
      </div>

      {sa && <div className="cd">
        <div className="ct">New Player</div>
        <div className="mb8"><div className="il">Name</div>
          <input className="inp" placeholder="Player name" value={nm} onChange={e => setNm(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        </div>
        <div className="mb10"><div className="il">Handicap Index</div>
          <input className="inp" type="number" step="0.1" placeholder="12.5" value={ix} onChange={e => setIx(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        </div>
        <div className="fx g6">
          <button className="btn bp" onClick={add}>Add Player</button>
          <button className="btn bs" onClick={() => { setSa(false); setNm(""); setIx(""); }}>Cancel</button>
        </div>
      </div>}

      {players.length === 0 && !sa && (
        <div className="empty">
          <div className="empty-i">{"\uD83D\uDC65"}</div>
          <div className="empty-t">No players yet</div>
          <div style={{ fontSize: 14, color: T.dim, marginTop: 8 }}>Add players to start tracking rounds</div>
        </div>
      )}

      {players.map(p => (
        <div key={p.id} className="prow">
          <div style={{ flex: 1 }}>
            <div className="prow-n">{p.name}</div>
            <div className="prow-i">Index: {p.index}</div>
          </div>
          <button className="bg" onClick={() => setEdit({ ...p })}>Edit</button>
          <button className="bg" style={{ color: T.red, borderColor: T.red + "33" }} onClick={() => rm(p.id, p.name)}>Delete</button>
        </div>
      ))}

      {edit && <div className="mbg" onClick={() => setEdit(null)}>
        <div className="mdl" onClick={e => e.stopPropagation()}>
          <div className="mdt">Edit Player</div>
          <div className="mb8"><div className="il">Name</div>
            <input className="inp" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />
          </div>
          <div className="mb10"><div className="il">Handicap Index</div>
            <input className="inp" type="number" step="0.1" value={edit.index} onChange={e => setEdit({ ...edit, index: e.target.value })} />
          </div>
          <div className="fx g8">
            <button className="btn bs" onClick={() => setEdit(null)}>Cancel</button>
            <button className="btn bp" onClick={saveEdit}>Save</button>
          </div>
        </div>
      </div>}
    </div>
  );
};

export default Players;
