import { fmt$ } from './golf';

// N-player skins calculator for tournament-wide skins
// Does NOT use calcAll (which requires exactly 4 players)
export function calcTournamentSkins(config, players) {
  const n = players.length;
  if (n < 2) return { holeResults: [], skinCounts: [], totalSkins: 0, pot: 0, perSkin: 0, playerResults: [] };

  const cnt = Array(n).fill(0);
  const hr = [];
  let carry = 0;

  for (let h = 0; h < 18; h++) {
    // Only score a hole once ALL tournament players have completed it
    if (!players.every(p => p.scores[h] != null)) {
      hr.push({ h: h + 1, r: "--", w: null, v: 0 });
      continue;
    }

    const sc = players.map((p, i) => ({
      i,
      net: config.net ? p.scores[h] - p.strokeHoles[h] : p.scores[h]
    }));
    const best = Math.min(...sc.map(s => s.net));
    const winners = sc.filter(s => s.net === best);

    if (winners.length === 1) {
      const v = 1 + carry;
      cnt[winners[0].i] += v;
      hr.push({ h: h + 1, r: players[winners[0].i].name.split(" ")[0], w: winners[0].i, v });
      carry = 0;
    } else {
      if (config.carryOver) {
        carry++;
        hr.push({ h: h + 1, r: "C", w: null, v: 0 });
      } else {
        hr.push({ h: h + 1, r: "P", w: null, v: 0 });
      }
    }
  }

  const totalSkins = cnt.reduce((a, b) => a + b, 0);
  const pot = config.potPerPlayer * n;
  const perSkin = totalSkins > 0 ? pot / totalSkins : 0;

  const playerResults = players.map((p, i) => {
    const earnings = cnt[i] * perSkin;
    return {
      name: p.name,
      groupIdx: p.groupIdx,
      skins: cnt[i],
      earnings,
      netPL: earnings - config.potPerPlayer,
      netPLStr: fmt$(earnings - config.potPerPlayer)
    };
  }).sort((a, b) => b.skins - a.skins || b.earnings - a.earnings);

  return { holeResults: hr, skinCounts: cnt, totalSkins, pot, perSkin, playerResults, carry };
}

// Match play calculator for Ryder Cup matches
// players = enriched players array for one group (2 for singles, 4 for best ball)
// matchType = "singles" | "bestball"
// In group order: team1 players first, then team2 players
//   singles: [t1player, t2player]
//   bestball: [t1p1, t1p2, t2p1, t2p2]
export function calcMatchPlay(players, matchType) {
  let t1Won = 0, t2Won = 0, played = 0;

  for (let h = 0; h < 18; h++) {
    if (!players.every(p => p.scores[h] != null)) break;
    played++;

    let t1Score, t2Score;
    if (matchType === 'singles') {
      t1Score = players[0].scores[h] - (players[0].strokeHoles?.[h] || 0);
      t2Score = players[1].scores[h] - (players[1].strokeHoles?.[h] || 0);
    } else {
      // Best ball: best net score from each pair
      const t1a = players[0].scores[h] - (players[0].strokeHoles?.[h] || 0);
      const t1b = players[1].scores[h] - (players[1].strokeHoles?.[h] || 0);
      const t2a = players[2].scores[h] - (players[2].strokeHoles?.[h] || 0);
      const t2b = players[3].scores[h] - (players[3].strokeHoles?.[h] || 0);
      t1Score = Math.min(t1a, t1b);
      t2Score = Math.min(t2a, t2b);
    }

    if (t1Score < t2Score) t1Won++;
    else if (t2Score < t1Score) t2Won++;
  }

  const remaining = 18 - played;
  const lead = t1Won - t2Won;
  const absLead = Math.abs(lead);
  const clinched = absLead > remaining && played > 0;
  const finished = played === 18 || clinched;

  let statusText, statusTeam;
  if (played === 0) {
    statusText = 'Not started';
    statusTeam = 0;
  } else if (finished) {
    if (lead === 0) {
      statusText = 'HALVED';
      statusTeam = 0;
    } else if (remaining === 0) {
      statusText = `${absLead} UP`;
      statusTeam = lead > 0 ? 1 : 2;
    } else {
      statusText = `${absLead} & ${remaining}`;
      statusTeam = lead > 0 ? 1 : 2;
    }
  } else {
    if (lead === 0) {
      statusText = 'AS';
      statusTeam = 0;
    } else if (absLead === remaining) {
      statusText = 'DORMIE';
      statusTeam = lead > 0 ? 1 : 2;
    } else {
      statusText = `${absLead} UP`;
      statusTeam = lead > 0 ? 1 : 2;
    }
  }

  // Points: 1 for win, 0.5 for halve, 0 for loss (only if match is finished)
  let pts = [0, 0];
  if (finished) {
    if (lead > 0) pts = [1, 0];
    else if (lead < 0) pts = [0, 1];
    else pts = [0.5, 0.5];
  }

  return { t1Won, t2Won, played, remaining, lead, absLead, clinched, finished, statusText, statusTeam, points: pts };
}

// Aggregate Ryder Cup standings across all matches
// tournament must have format='rydercup' and teamConfig
export function calcRyderCupStandings(tournament) {
  const tc = tournament.teamConfig;
  if (!tc || !tc.matches) return { team1Points: 0, team2Points: 0, matchResults: [], totalMatches: 0 };

  let t1Pts = 0, t2Pts = 0;
  const matchResults = tc.matches.map(m => {
    const group = tournament.groups[m.groupIdx];
    if (!group) return { matchType: m.type, statusText: '?', statusTeam: 0, points: [0, 0], played: 0, finished: false };

    const result = calcMatchPlay(group.players, m.type);
    t1Pts += result.points[0];
    t2Pts += result.points[1];

    // Build display names
    const pl = group.players;
    const t1Names = m.type === 'singles' ? pl[0].name.split(' ')[0] : pl[0].name.split(' ')[0] + ' & ' + pl[1].name.split(' ')[0];
    const t2Names = m.type === 'singles' ? pl[1].name.split(' ')[0] : pl[2].name.split(' ')[0] + ' & ' + pl[3].name.split(' ')[0];

    return { ...result, matchType: m.type, t1Names, t2Names, groupIdx: m.groupIdx };
  });

  return { team1Points: t1Pts, team2Points: t2Pts, matchResults, totalMatches: tc.matches.length };
}
