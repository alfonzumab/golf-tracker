import { useState, useEffect } from 'react';
import { T } from '../theme';
import { supabase } from '../lib/supabase';

const Players = ({ players, setPlayers, isAdmin }) => {
  const [sa, setSa] = useState(false);
  const [nm, setNm] = useState("");
  const [ix, setIx] = useState("");
  const [fv, setFv] = useState(false);
  const [edit, setEdit] = useState(null);
  const [inactive, setInactive] = useState([]);

  // Load inactive players for admin view
  useEffect(() => {
    if (!isAdmin) return;
    const loadInactive = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('is_active', false)
        .order('name');
      if (!error && data) {
        setInactive(data.map(p => ({ id: p.id, name: p.name, index: Number(p.index), favorite: false })));
      }
    };
    loadInactive();
  }, [isAdmin]);

  const add = () => {
    if (!nm.trim()) return;
    const up = [...players, { id: crypto.randomUUID(), name: nm.trim(), index: parseFloat(ix) || 0, favorite: fv }];
    setPlayers(up); setNm(""); setIx(""); setFv(false); setSa(false);
  };

  const rm = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This will hide the player from all users.`)) return;
    // Soft delete: set is_active = false
    const { error } = await supabase.from('players').update({ is_active: false }).eq('id', id);
    if (error) {
      console.error('Failed to delete player:', error);
      return;
    }
    const up = players.filter(p => p.id !== id);
    setPlayers(up);
    setInactive([...inactive, players.find(p => p.id === id)]);
  };

  const togFav = (id) => {
    const up = players.map(p => p.id === id ? { ...p, favorite: !p.favorite } : p);
    setPlayers(up);
  };

  const saveEdit = () => {
    if (!edit || !edit.name.trim()) return;
    const up = players.map(p => p.id === edit.id ? { ...p, name: edit.name.trim(), index: parseFloat(edit.index) || 0, favorite: edit.favorite || false } : p);
    setPlayers(up); setEdit(null);
  };



  return (
    <div className="pg">
      <div className="fxb mb10">
        <span className="pg-title">Players</span>
        {isAdmin && <button className="btn bp bsm" onClick={() => setSa(true)}>+ Add</button>}
      </div>

      {sa && <div className="cd">
        <div className="ct">New Player</div>
        <div className="mb8"><div className="il">Name</div>
          <input className="inp" placeholder="Player name" value={nm} onChange={e => setNm(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        </div>
        <div className="mb10"><div className="il">Handicap Index</div>
          <input className="inp" type="number" step="0.1" placeholder="12.5" value={ix} onChange={e => setIx(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        </div>
        <div className="mb10">
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={fv} onChange={e => setFv(e.target.checked)} />
            <span style={{ fontSize: 14 }}>Add to favorites</span>
          </label>
        </div>
        <div className="fx g6">
          <button className="btn bp" onClick={add}>Add Player</button>
          <button className="btn bs" onClick={() => { setSa(false); setNm(""); setIx(""); setFv(false); }}>Cancel</button>
        </div>
      </div>}

      {players.length === 0 && !sa && (
        <div className="empty">
          <div className="empty-i">{"\uD83D\uDC65"}</div>
          <div className="empty-t">No players yet</div>
          <div style={{ fontSize: 14, color: T.dim, marginTop: 8, marginBottom: 16 }}>Add players to start tracking rounds</div>
        </div>
      )}

      {players.map(p => (
        <div key={p.id} className="prow">
          <div style={{ flex: 1 }}>
            <div className="prow-n" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span onClick={() => togFav(p.id)} style={{ cursor: "pointer", fontSize: 16 }}>
                {p.favorite ? "⭐" : "☆"}
              </span>
              {p.name}
            </div>
            <div className="prow-i">Index: {p.index}</div>
          </div>
          {isAdmin && (
            <>
              <button className="bg" onClick={() => setEdit({ ...p })}>Edit</button>
              <button className="bg" style={{ color: T.red, borderColor: T.red + "33" }} onClick={() => rm(p.id, p.name)}>Delete</button>
            </>
          )}
        </div>
      ))}

      {isAdmin && inactive.length > 0 && (
        <>
          <div className="dvd" />
          <div className="mb10" style={{ fontSize: 14, color: T.dim, fontWeight: 600 }}>Inactive Players</div>
          {inactive.map(p => (
            <div key={p.id} className="prow" style={{ opacity: 0.6 }}>
              <div style={{ flex: 1 }}>
                <div className="prow-n">{p.name}</div>
                <div className="prow-i">Index: {p.index}</div>
              </div>
              <button className="btn bg bsm" onClick={async () => {
                await supabase.from('players').update({ is_active: true }).eq('id', p.id);
                setInactive(inactive.filter(ip => ip.id !== p.id));
                // Reload active players
                const { data } = await supabase.from('players').select('*').eq('is_active', true).order('name');
                if (data) {
                  const activePlayers = data.map(ap => ({ id: ap.id, name: ap.name, index: Number(ap.index), favorite: false }));
                  setPlayers(activePlayers);
                }
              }}>Restore</button>
            </div>
          ))}
        </>
      )}

      {edit && <div className="mbg" onClick={() => setEdit(null)}>
        <div className="mdl" onClick={e => e.stopPropagation()}>
          <div className="mdt">Edit Player</div>
          <div className="mb8"><div className="il">Name</div>
            <input className="inp" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />
          </div>
          <div className="mb10"><div className="il">Handicap Index</div>
            <input className="inp" type="number" step="0.1" value={edit.index} onChange={e => setEdit({ ...edit, index: e.target.value })} />
          </div>
          <div className="mb10">
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={edit.favorite || false} onChange={e => setEdit({ ...edit, favorite: e.target.checked })} />
              <span style={{ fontSize: 14 }}>Favorite player</span>
            </label>
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
