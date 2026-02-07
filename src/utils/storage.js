import { supabase } from '../lib/supabase';
import { generateShareCode } from './tournamentStorage';

// Local cache (instant UI, offline fallback)
export const sv = (k, d) => { try { localStorage.setItem("gt3-" + k, JSON.stringify(d)); } catch {} };
export const ld = (k, f) => { try { const d = localStorage.getItem("gt3-" + k); return d ? JSON.parse(d) : f; } catch { return f; } };

// --- Supabase CRUD ---

export async function loadPlayers() {
  const { data, error } = await supabase.from('players').select('*').order('created_at');
  if (error) return ld('players', []);
  const players = data.map(p => ({ id: p.id, name: p.name, index: Number(p.index) }));
  sv('players', players);
  return players;
}

export async function savePlayers(players) {
  sv('players', players);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Clear and re-insert to guarantee deleted players stay deleted
  const { error: delErr } = await supabase.from('players').delete().eq('user_id', user.id);
  if (delErr) return; // Don't insert if delete failed — data still intact
  if (players.length > 0) {
    const { error: insErr } = await supabase.from('players').insert(
      players.map(p => ({ id: p.id, user_id: user.id, name: p.name, index: p.index }))
    );
    // If insert fails, restore from localStorage on next load
    if (insErr) console.error('savePlayers insert failed:', insErr.message);
  }
}

export async function loadCourses() {
  const { data, error } = await supabase.from('courses').select('*').order('created_at');
  if (error) return ld('courses', []);
  const courses = data.map(c => ({ id: c.id, name: c.name, city: c.city, tees: c.tees }));
  sv('courses', courses);
  return courses;
}

export async function saveCourses(courses) {
  sv('courses', courses);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Clear and re-insert to guarantee deleted courses stay deleted
  await supabase.from('courses').delete().eq('user_id', user.id);
  if (courses.length > 0) {
    await supabase.from('courses').insert(
      courses.map(c => ({ id: c.id, user_id: user.id, name: c.name, city: c.city, tees: c.tees }))
    );
  }
}

export async function loadRounds() {
  const { data, error } = await supabase.from('rounds').select('*').eq('is_current', false).order('created_at');
  if (error) return ld('rounds', []);
  const rounds = data.map(r => ({ id: r.id, date: r.date, course: r.course, players: r.players, games: r.games, shareCode: r.share_code }));
  sv('rounds', rounds);
  return rounds;
}

export async function saveRound(rounds) {
  sv('rounds', rounds);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Delete all non-current rounds owned by this user, re-insert
  await supabase.from('rounds').delete().eq('is_current', false).eq('user_id', user.id);
  for (const r of rounds) {
    await supabase.from('rounds').insert({
      id: r.id, user_id: user.id, date: r.date, course: r.course, players: r.players, games: r.games, is_current: false, share_code: r.shareCode || null
    });
  }
}

export async function loadCurrentRound() {
  const { data, error } = await supabase.from('rounds').select('*').eq('is_current', true).limit(1);
  if (error || !data || data.length === 0) return ld('currentRound', null);
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
  const { data, error } = await supabase.from('user_preferences').select('selected_course_id').limit(1);
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

// Import local data on first login — only runs if user has no data in Supabase yet
export async function importLocalData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Only migrate if user has ZERO data in Supabase (true first-time setup)
  const { count } = await supabase.from('players').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
  const { count: cCount } = await supabase.from('courses').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
  if ((count || 0) > 0 || (cCount || 0) > 0) return;

  const localPlayers = ld('players', []);
  const localCourses = ld('courses', []);
  const localRounds = ld('rounds', []);
  const localCurrent = ld('currentRound', null);

  // Skip if localStorage has nothing to import
  const hasLocalData = localPlayers.length > 0 || localCourses.length > 0 || localRounds.length > 0 || localCurrent;
  if (!hasLocalData) return;

  if (localPlayers.length > 0) {
    await supabase.from('players').upsert(
      localPlayers.map(p => ({ id: p.id, user_id: user.id, name: p.name, index: p.index })),
      { onConflict: 'id' }
    );
  }

  if (localCourses.length > 0) {
    await supabase.from('courses').upsert(
      localCourses.map(c => ({ id: c.id, user_id: user.id, name: c.name, city: c.city, tees: c.tees })),
      { onConflict: 'id' }
    );
  }

  if (localRounds.length > 0) {
    for (const r of localRounds) {
      await supabase.from('rounds').upsert({ id: r.id, user_id: user.id, date: r.date, course: r.course, players: r.players, games: r.games, is_current: false });
    }
  }
  if (localCurrent) {
    await supabase.from('rounds').upsert({ id: localCurrent.id, user_id: user.id, date: localCurrent.date, course: localCurrent.course, players: localCurrent.players, games: localCurrent.games, is_current: true });
  }
}
