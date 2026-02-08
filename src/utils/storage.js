import { supabase } from '../lib/supabase';
import { generateShareCode } from './tournamentStorage';

// Local cache (instant UI, offline fallback)
export const sv = (k, d) => { try { localStorage.setItem("gt3-" + k, JSON.stringify(d)); } catch { /* Silently handle localStorage errors */ } };
export const ld = (k, f) => { try { const d = localStorage.getItem("gt3-" + k); return d ? JSON.parse(d) : f; } catch { return f; } };

// --- Supabase CRUD ---

export async function loadPlayers() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ld('players', []);

  // Load all active players
  const { data: playersData, error: playersError } = await supabase
    .from('players')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (playersError) return ld('players', []);

  // Load user's favorites
  const { data: favoritesData, error: favoritesError } = await supabase
    .from('user_favorites')
    .select('player_id')
    .eq('user_id', user.id);

  if (favoritesError) {
    console.error('loadPlayers: Failed to load favorites:', favoritesError.message);
  }

  const favoriteIds = new Set(favoritesData?.map(f => f.player_id) || []);

  const players = playersData.map(p => ({
    id: p.id,
    name: p.name,
    index: Number(p.index),
    favorite: favoriteIds.has(p.id)
  }));

  sv('players', players);
  return players;
}

export async function savePlayersFavorites(favoritePlayerIds) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    // Get existing favorites
    const { data: existing, error: fetchErr } = await supabase
      .from('user_favorites')
      .select('player_id')
      .eq('user_id', user.id);

    if (fetchErr) {
      console.error('savePlayersFavorites: Failed to fetch existing favorites:', fetchErr.message);
      return;
    }

    const existingIds = new Set(existing?.map(f => f.player_id) || []);
    const newIds = new Set(favoritePlayerIds);

    const toDelete = [...existingIds].filter(id => !newIds.has(id));
    const toInsert = [...newIds].filter(id => !existingIds.has(id));

    // Delete removed favorites
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .in('player_id', toDelete);

      if (delErr) {
        console.error('savePlayersFavorites: Failed to delete favorites:', delErr.message);
      }
    }

    // Insert new favorites
    if (toInsert.length > 0) {
      const { error: insErr } = await supabase
        .from('user_favorites')
        .insert(toInsert.map(id => ({ user_id: user.id, player_id: id })));

      if (insErr) {
        console.error('savePlayersFavorites: Failed to insert favorites:', insErr.message);
      }
    }

  } catch (e) {
    console.error('savePlayersFavorites: Unexpected error:', e);
  }
}

export async function adminSavePlayers(players) {
  try {
    // Get existing players from database (global)
    const { data: existing, error: fetchErr } = await supabase
      .from('players')
      .select('id');

    if (fetchErr) {
      console.error('adminSavePlayers: Failed to fetch existing players:', fetchErr.message);
      return;
    }

    const existingIds = new Set(existing?.map(p => p.id) || []);
    const newIds = new Set(players.map(p => p.id));

    // Only delete players that are actually removed (soft delete by setting is_active = false)
    const toSoftDelete = [...existingIds].filter(id => !newIds.has(id));
    const toUpsert = players.map(p => ({
      id: p.id,
      name: p.name,
      index: p.index,
      is_active: true
    }));

    // Safety check: Don't delete more than 50 players at once
    if (toSoftDelete.length > 50) {
      console.error(`adminSavePlayers: Refusing to soft-delete ${toSoftDelete.length} players. This looks like a bug.`);
      return;
    }

    // Soft delete removed players
    if (toSoftDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('players')
        .update({ is_active: false })
        .in('id', toSoftDelete);

      if (delErr) {
        console.error('adminSavePlayers: Failed to soft-delete players:', delErr.message);
        return;
      }
    }

    // Upsert current players
    if (toUpsert.length > 0) {
      const { error: upsertErr } = await supabase
        .from('players')
        .upsert(toUpsert, { onConflict: 'id' });

      if (upsertErr) {
        console.error('adminSavePlayers: Failed to upsert players:', upsertErr.message);
      }
    }

  } catch (e) {
    console.error('adminSavePlayers: Unexpected error:', e);
  }
}

export async function loadCourses() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ld('courses', []);

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) return ld('courses', []);
  const courses = data.map(c => ({ id: c.id, name: c.name, city: c.city, tees: c.tees }));
  sv('courses', courses);
  return courses;
}

export async function adminSaveCourses(courses) {
  try {
    // Get existing courses from database (global)
    const { data: existing, error: fetchErr } = await supabase
      .from('courses')
      .select('id');

    if (fetchErr) {
      console.error('adminSaveCourses: Failed to fetch existing courses:', fetchErr.message);
      return;
    }

    const existingIds = new Set(existing?.map(c => c.id) || []);
    const newIds = new Set(courses.map(c => c.id));

    // Only delete courses that are actually removed (soft delete)
    const toSoftDelete = [...existingIds].filter(id => !newIds.has(id));
    const toUpsert = courses.map(c => ({
      id: c.id,
      name: c.name,
      city: c.city,
      tees: c.tees,
      is_active: true
    }));

    // Safety check: Don't delete more than 20 courses at once
    if (toSoftDelete.length > 20) {
      console.error(`adminSaveCourses: Refusing to soft-delete ${toSoftDelete.length} courses. This looks like a bug.`);
      return;
    }

    // Soft delete removed courses
    if (toSoftDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('courses')
        .update({ is_active: false })
        .in('id', toSoftDelete);

      if (delErr) {
        console.error('adminSaveCourses: Failed to soft-delete courses:', delErr.message);
        return;
      }
    }

    // Upsert current courses
    if (toUpsert.length > 0) {
      const { error: upsertErr } = await supabase
        .from('courses')
        .upsert(toUpsert, { onConflict: 'id' });

      if (upsertErr) {
        console.error('adminSaveCourses: Failed to upsert courses:', upsertErr.message);
      }
    }

  } catch (e) {
    console.error('adminSaveCourses: Unexpected error:', e);
  }
}

export async function loadRounds() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ld('rounds', []);

  const { data, error } = await supabase.from('rounds').select('*').eq('user_id', user.id).eq('is_current', false).order('created_at');
  if (error) return ld('rounds', []);
  const rounds = data.map(r => ({ id: r.id, date: r.date, course: r.course, players: r.players, games: r.games, shareCode: r.share_code }));
  sv('rounds', rounds);
  return rounds;
}

export async function saveRound(rounds) {
  sv('rounds', rounds);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    // Get existing non-current rounds from database
    const { data: existing, error: fetchErr } = await supabase
      .from('rounds')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_current', false);

    if (fetchErr) {
      console.error('saveRound: Failed to fetch existing rounds:', fetchErr.message);
      return;
    }

    const existingIds = new Set(existing?.map(r => r.id) || []);
    const newIds = new Set(rounds.map(r => r.id));

    // Only delete rounds that are actually removed
    const toDelete = [...existingIds].filter(id => !newIds.has(id));
    const toUpsert = rounds.map(r => ({
      id: r.id,
      user_id: user.id,
      date: r.date,
      course: r.course,
      players: r.players,
      games: r.games,
      is_current: false,
      share_code: r.shareCode || null
    }));

    // Safety check: Don't delete more than 50 rounds at once
    if (toDelete.length > 50) {
      console.error(`saveRound: Refusing to delete ${toDelete.length} rounds. This looks like a bug.`);
      return;
    }

    // Delete removed rounds
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('rounds')
        .delete()
        .eq('user_id', user.id)
        .eq('is_current', false)
        .in('id', toDelete);

      if (delErr) {
        console.error('saveRound: Failed to delete rounds:', delErr.message);
        return;
      }
    }

    // Upsert current rounds
    if (toUpsert.length > 0) {
      const { error: upsertErr } = await supabase
        .from('rounds')
        .upsert(toUpsert, { onConflict: 'id' });

      if (upsertErr) {
        console.error('saveRound: Failed to upsert rounds:', upsertErr.message);
      }
    }

  } catch (e) {
    console.error('saveRound: Unexpected error:', e);
  }
}

export async function loadCurrentRound() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ld('currentRound', null);

  const { data, error } = await supabase.from('rounds').select('*').eq('user_id', user.id).eq('is_current', true).limit(1);
  if (error) return ld('currentRound', null); // Network error: use localStorage fallback
  if (!data || data.length === 0) {
    sv('currentRound', null); // Supabase says no round — clear stale localStorage
    return null;
  }
  const r = data[0];
  const round = { id: r.id, date: r.date, course: r.course, players: r.players, games: r.games, shareCode: r.share_code };
  sv('currentRound', round);
  return round;
}

let saveCurrentTimeout = null;
export async function saveCurrentRound(round) {
  sv('currentRound', round);
  // Debounce Supabase writes (scoring taps happen fast)
  clearTimeout(saveCurrentTimeout);
  saveCurrentTimeout = setTimeout(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !round) return;

    if (round.shareCode) {
      // Try UPDATE by share_code (works for both owner and participants)
      const { data } = await supabase.from('rounds')
        .update({ players: round.players, games: round.games })
        .eq('share_code', round.shareCode)
        .eq('is_current', true)
        .select();

      // If no row updated (first save), insert as owner
      if (!data || data.length === 0) {
        await supabase.from('rounds').delete().eq('is_current', true).eq('user_id', user.id);
        await supabase.from('rounds').insert({
          id: round.id, user_id: user.id, date: round.date, course: round.course,
          players: round.players, games: round.games, is_current: true, share_code: round.shareCode
        });
      }
    } else {
      // Legacy flow (no share code)
      await supabase.from('rounds').delete().eq('is_current', true).eq('user_id', user.id);
      await supabase.from('rounds').insert({
        id: round.id, user_id: user.id, date: round.date, course: round.course, players: round.players, games: round.games, is_current: true
      });
    }
  }, 1500);
}

export async function clearCurrentRound() {
  sv('currentRound', null);
  clearTimeout(saveCurrentTimeout);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  // Only delete rounds owned by this user (don't delete if participant)
  await supabase.from('rounds').delete().eq('is_current', true).eq('user_id', user.id);
}

// Join a round by share code
export async function joinRound(code) {
  const { data, error } = await supabase.rpc('join_round', { p_code: code.toUpperCase() });
  if (error) return { error: error.message };
  if (!data) return { error: 'Round not found' };
  if (data.error) return { error: data.error };
  const round = {
    id: data.id, date: data.date, course: data.course,
    players: data.players, games: data.games, shareCode: data.share_code
  };
  sv('currentRound', round);
  return { round };
}

export { generateShareCode };

export async function loadSelectedCourse() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ld('selectedCourse', null);

  const { data, error } = await supabase.from('user_preferences').select('selected_course_id').eq('user_id', user.id).limit(1);
  if (error || !data || data.length === 0) return ld('selectedCourse', null);
  sv('selectedCourse', data[0].selected_course_id);
  return data[0].selected_course_id;
}

export async function saveSelectedCourse(courseId) {
  sv('selectedCourse', courseId);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('user_preferences').upsert({ user_id: user.id, selected_course_id: courseId });
}

export async function loadProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('loadProfile: Failed to load profile:', error.message);
    return null;
  }

  return data;
}

export async function saveProfile(updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    console.error('saveProfile: Failed to save profile:', error.message);
  }
}


