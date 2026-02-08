import { supabase } from '../lib/supabase';
import { sv, ld } from './storage';

// 6-char share code (no ambiguous chars: 0/O, 1/I/L)
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function generateShareCode() {
  let code = '';
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

// Save tournament guest identity
export const saveGuestInfo = (info) => sv('tournament-guest', info);
export const loadGuestInfo = () => ld('tournament-guest', null);
export const clearGuestInfo = () => sv('tournament-guest', null);

// Save active tournament code for quick resume
export const saveActiveTournament = (code) => sv('active-tournament', code);
export const loadActiveTournament = () => ld('active-tournament', null);
export const clearActiveTournament = () => sv('active-tournament', null);

// --- Supabase RPC wrappers ---

export async function createTournament({ name, date, course, teeName, groups, tournamentGames, teamConfig, format }) {
  const code = generateShareCode();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not logged in' };

  const row = {
    share_code: code, host_user_id: user.id, name, date, course,
    tee_name: teeName, groups, tournament_games: tournamentGames || [],
    team_config: teamConfig || null, format: format || 'standard', status: 'setup'
  };

  const { error } = await supabase.from('tournaments').insert(row);

  if (error) {
    // Retry once with new code if collision
    if (error.code === '23505') {
      const code2 = generateShareCode();
      const { error: e2 } = await supabase.from('tournaments').insert({ ...row, share_code: code2 });
      if (e2) return { error: e2.message };
      saveActiveTournament(code2);
      return { code: code2 };
    }
    return { error: error.message };
  }

  saveActiveTournament(code);
  return { code };
}

export async function getTournament(code) {
  const { data, error } = await supabase.rpc('get_tournament', { p_code: code.toUpperCase() });
  if (error) return { error: error.message };
  if (!data) return { error: 'Tournament not found' };
  // RPC may return array or single object depending on function signature
  const t = Array.isArray(data) ? data[0] : data;
  if (!t || !t.id) return { error: 'Tournament not found' };
  return {
    tournament: {
      id: t.id,
      shareCode: t.share_code,
      hostUserId: t.host_user_id,
      name: t.name,
      date: t.date,
      course: t.course,
      teeName: t.tee_name,
      groups: t.groups || [],
      tournamentGames: Array.isArray(t.tournament_games) ? t.tournament_games : [],
      teamConfig: t.team_config,
      format: t.format || 'standard',
      status: t.status
    }
  };
}

export async function saveTournamentSetup(tournament) {
  const { error } = await supabase.rpc('save_tournament', {
    p_tournament: {
      share_code: tournament.shareCode,
      name: tournament.name,
      date: tournament.date,
      course: tournament.course,
      tee_name: tournament.teeName,
      groups: tournament.groups,
      tournament_games: tournament.tournamentGames || [],
      team_config: tournament.teamConfig || null
    }
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function startTournament(code) {
  const { error } = await supabase.rpc('update_tournament_status', {
    p_code: code, p_status: 'live'
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function finishTournament(code) {
  const { error } = await supabase.rpc('update_tournament_status', {
    p_code: code, p_status: 'finished'
  });
  if (error) return { error: error.message };
  return { ok: true };
}

const scoreTimeouts = {};
export function updateTournamentScore(code, groupIdx, playerIdx, holeIdx, score) {
  // Per-cell debounce so scoring different players doesn't cancel each other
  const key = `${groupIdx}-${playerIdx}-${holeIdx}`;
  clearTimeout(scoreTimeouts[key]);
  scoreTimeouts[key] = setTimeout(async () => {
    await supabase.rpc('update_tournament_score', {
      p_code: code, p_group_idx: groupIdx, p_player_idx: playerIdx,
      p_hole_idx: holeIdx, p_score: score
    });
    delete scoreTimeouts[key];
  }, 500);
}

export async function updateGroupGames(code, groupIdx, games) {
  const { error } = await supabase.rpc('update_group_games', {
    p_code: code, p_group_idx: groupIdx, p_games: games
  });
  if (error) return { error: error.message };
  return { ok: true };
}

// ========== Tournament History RPCs ==========

export async function registerTournamentParticipant(tournamentId, groupIdx = null, playerIdx = null) {
  const { data, error } = await supabase.rpc('register_tournament_participant', {
    p_tournament_id: tournamentId,
    p_group_idx: groupIdx,
    p_player_idx: playerIdx
  });

  if (error) {
    console.error('registerTournamentParticipant: Failed to register:', error.message);
    return { error: error.message };
  }

  return data;
}

export async function loadTournamentHistory() {
  const { data, error } = await supabase.rpc('load_tournament_history');

  if (error) {
    console.error('loadTournamentHistory: Failed to load:', error.message);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Convert snake_case to camelCase
  return data.map(t => ({
    id: t.id,
    shareCode: t.share_code,
    hostUserId: t.host_user_id,
    name: t.name,
    date: t.date,
    course: t.course,
    teeName: t.tee_name,
    groups: t.groups || [],
    tournamentGames: Array.isArray(t.tournament_games) ? t.tournament_games : [],
    teamConfig: t.team_config,
    format: t.format || 'standard',
    status: t.status,
    createdAt: t.created_at,
    updatedAt: t.updated_at
  }));
}

export async function reopenTournament(code) {
  const { error } = await supabase.rpc('update_tournament_status', {
    p_code: code,
    p_status: 'live'
  });

  if (error) {
    console.error('reopenTournament: Failed to reopen:', error.message);
    return { error: error.message };
  }

  return { ok: true };
}
