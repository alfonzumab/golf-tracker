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
  const [search, setSearch] = useState("");

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



  // Filter and sort players: favorites first, then others, filtered by search
  const filteredPlayers = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    return a.name.localeCompare(b.name);
  });

  const filteredInactive = inactive.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="pg">
      <div className="fxb mb10">
        <span className="pg-title">Players</span>
        {isAdmin && <button className="btn bp bsm" onClick={() => setSa(true)}>+ Add</button>}
      </div>

      <div className="mb10">
        <input className="inp" placeholder="Search players..." value={search} onChange={e => setSearch(e.target.value)} />
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

      {sortedPlayers.length === 0 && !sa && search === "" && (
        <div className="empty">
          <div className="empty-i">{"\uD83D\uDC65"}</div>
          <div className="empty-t">No players yet</div>
          <div style={{ fontSize: 14, color: T.dim, marginTop: 8, marginBottom: 16 }}>Add players to start tracking rounds</div>
        </div>
      )}

      {/* Player Grid - 2 columns for better space usage */}
      <div className="g2" style={{ gap: '8px' }}>
        {sortedPlayers.map(p => (
          <div key={p.id} className="cd" style={{ padding: '12px', margin: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span onClick={() => togFav(p.id)} style={{ cursor: "pointer", fontSize: 16 }}>
                {p.favorite ? "⭐" : "☆"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="prow-n" style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </div>
                <div className="prow-i" style={{ fontSize: '12px', color: T.dim }}>Index: {p.index}</div>
              </div>
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn bg bsm" onClick={() => setEdit({ ...p })}>Edit</button>
                <button className="btn bg bsm" style={{ color: T.red, borderColor: T.red + "33" }} onClick={() => rm(p.id, p.name)}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdmin && inactive.length > 0 && (
        <>
          <div className="dvd" />
          <div className="mb10" style={{ fontSize: 14, color: T.dim, fontWeight: 600 }}>Inactive Players</div>
          <div className="g2" style={{ gap: '8px' }}>
            {filteredInactive.map(p => (
              <div key={p.id} className="cd" style={{ padding: '12px', margin: 0, opacity: 0.6 }}>
                <div style={{ marginBottom: 8 }}>
                  <div className="prow-n" style={{ fontSize: '14px', fontWeight: 600 }}>{p.name}</div>
                  <div className="prow-i" style={{ fontSize: '12px', color: T.dim }}>Index: {p.index}</div>
                </div>
                <div>
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
              </div>
            ))}
          </div>
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
