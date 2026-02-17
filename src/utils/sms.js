import { supabase } from '../lib/supabase';

/**
 * Detect if the current platform is Android
 */
function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

/**
 * Build an sms: URL for group texting
 * @param {string[]} phoneNumbers - Array of phone numbers (e.g. ['+15551234567'])
 * @param {string} bodyText - Message body
 * @returns {string} sms: URL
 */
export function buildSmsUrl(phoneNumbers, bodyText) {
  const nums = phoneNumbers.join(',');
  const body = encodeURIComponent(bodyText);

  if (isAndroid()) {
    return `sms:${nums}?body=${body}`;
  }
  // iOS format (default)
  return `sms://open?addresses=${nums}&body=${body}`;
}

/**
 * Open the SMS app with a pre-filled group text
 * @param {string[]} phoneNumbers
 * @param {string} bodyText
 */
export function openSms(phoneNumbers, bodyText) {
  const url = buildSmsUrl(phoneNumbers, bodyText);
  window.open(url, '_self');
}

/**
 * Fetch phone numbers for round participants
 * @param {string} roundId - Round ID
 * @returns {Promise<string[]>} Array of phone numbers
 */
export async function fetchRoundParticipantPhones(roundId) {
  // Get participant user IDs from round_participants
  const { data: participants, error: pErr } = await supabase
    .from('round_participants')
    .select('user_id')
    .eq('round_id', roundId);

  if (pErr || !participants?.length) return [];

  const userIds = participants.map(p => p.user_id);
  return fetchPhonesByUserIds(userIds);
}

/**
 * Fetch phone numbers for tournament participants
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<string[]>} Array of phone numbers
 */
export async function fetchTournamentParticipantPhones(tournamentId) {
  const { data: participants, error: pErr } = await supabase
    .from('tournament_participants')
    .select('user_id')
    .eq('tournament_id', tournamentId);

  if (pErr || !participants?.length) return [];

  const userIds = participants.map(p => p.user_id);
  return fetchPhonesByUserIds(userIds);
}

/**
 * Call get_participant_phones RPC with user IDs
 * @param {string[]} userIds - Array of user UUIDs
 * @returns {Promise<string[]>} Array of phone numbers
 */
async function fetchPhonesByUserIds(userIds) {
  const { data, error } = await supabase.rpc('get_participant_phones', {
    p_participant_ids: userIds,
  });

  if (error || !data?.length) return [];
  return data.map(r => r.phone_number);
}
