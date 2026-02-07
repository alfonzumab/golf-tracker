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
