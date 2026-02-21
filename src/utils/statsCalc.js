import { calcAll } from './calc';

// Main entry point — returns null if no linked player or no data.
// timePeriod: 'lifetime' | 'ytd' | '2025' (4-digit year string)
export function calcAllStats(linkedPlayerId, rounds, tournamentHistory, timePeriod = 'lifetime') {
  if (!linkedPlayerId) return null;

  const allProcessed = processRounds(linkedPlayerId, rounds, tournamentHistory);
  if (allProcessed.length === 0) return null;

  // Compute available years from all rounds (before filtering)
  const yearSet = new Set(allProcessed.map(r => new Date(r.date).getFullYear()).filter(Boolean));
  const availableYears = [...yearSet].sort((a, b) => b - a);

  // Filter by time period
  const currentYear = new Date().getFullYear();
  let processed = allProcessed;
  if (timePeriod === 'ytd') {
    processed = allProcessed.filter(r => new Date(r.date).getFullYear() === currentYear);
  } else if (timePeriod !== 'lifetime') {
    const yr = parseInt(timePeriod, 10);
    if (!isNaN(yr)) processed = allProcessed.filter(r => new Date(r.date).getFullYear() === yr);
  }

  if (processed.length === 0) {
    return { roundCount: 0, scoring: null, games: null, skins: null, h2h: null, courses: null, trends: null, fun: null, availableYears };
  }

  const roundCount = processed.length;
  const scoring = calcScoringStats(processed);
  const games = calcGameProfitability(processed);
  const skins = calcSkinsStats(processed);
  const h2h = calcHeadToHead(processed);
  const courses = calcCoursePerformance(processed);
  const trends = calcTrends(processed);
  const fun = calcFunStats(processed);

  return { roundCount, scoring, games, skins, h2h, courses, trends, fun, availableYears };
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

// Normalize rounds + tournament groups into a unified array.
// Each entry: { date, courseName, playerIdx, players, games, calcResult, pars }
function processRounds(linkedPlayerId, rounds, tournamentHistory) {
  const result = [];

  for (const round of (rounds || [])) {
    if (!round.players) continue;
    try {
      const playerIdx = round.players.findIndex(p => p.id === linkedPlayerId);
      if (playerIdx === -1) continue;
      if (round.players.length < 2) continue;

      const calcResult = calcAll(round.games || [], round.players);
      const player = round.players[playerIdx];
      const pars = player.teeData?.pars || null;

      result.push({
        date: round.date,
        courseName: round.course?.name || 'Unknown',
        playerIdx,
        players: round.players,
        games: round.games || [],
        calcResult,
        pars,
      });
    } catch {
      // skip malformed rounds
    }
  }

  for (const tournament of (tournamentHistory || [])) {
    if (!tournament.groups) continue;
    for (const group of tournament.groups) {
      if (!group.players || group.players.length < 2) continue;
      try {
        const playerIdx = group.players.findIndex(p => p.id === linkedPlayerId);
        if (playerIdx === -1) continue;

        const calcResult = calcAll(group.games || [], group.players);
        result.push({
          date: tournament.date,
          courseName: tournament.course?.name || tournament.name || 'Tournament',
          playerIdx,
          players: group.players,
          games: group.games || [],
          calcResult,
          pars: null, // tournament players aren't enriched with teeData
        });
      } catch {
        // skip malformed groups
      }
    }
  }

  return result;
}

function calcScoringStats(processed) {
  const empty = {
    grossAvg: '--', netAvg: '--',
    distribution: { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0 },
    front9Avg: '--', back9Avg: '--',
    bestRound: null, worstRound: null,
    byParType: { par3: { avg: '--', count: 0 }, par4: { avg: '--', count: 0 }, par5: { avg: '--', count: 0 } },
    byCourse: [],
  };

  const scoringRounds = processed.filter(r => r.pars);
  if (scoringRounds.length === 0) return empty;

  const dist = { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0 };
  let grossSum = 0, netSum = 0, validRounds = 0;
  let frontSum = 0, frontRounds = 0, backSum = 0, backRounds = 0;
  let bestGross = Infinity, worstGross = -Infinity;
  let bestRound = null, worstRound = null;

  // Par type accumulators
  const parType = { 3: { sum: 0, count: 0 }, 4: { sum: 0, count: 0 }, 5: { sum: 0, count: 0 } };

  // Per-course accumulators
  const courseMap = {};

  for (const r of scoringRounds) {
    const player = r.players[r.playerIdx];
    const scores = player.scores || [];
    const strokeHoles = player.strokeHoles || Array(18).fill(0);
    let gross = 0, net = 0, holes = 0;
    let front = 0, frontH = 0, back = 0, backH = 0;

    // Ensure course entry
    if (!courseMap[r.courseName]) {
      courseMap[r.courseName] = {
        name: r.courseName,
        grossSum: 0, grossRounds: 0,
        netSum: 0, netRounds: 0,
        dist: { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0 },
      };
    }
    const cm = courseMap[r.courseName];
    let cGross = 0, cNet = 0, cHoles = 0;

    for (let h = 0; h < 18; h++) {
      if (scores[h] == null) continue;
      const par = r.pars[h];
      const score = scores[h];
      const diff = score - par;

      if (diff <= -2) { dist.eagles++; cm.dist.eagles++; }
      else if (diff === -1) { dist.birdies++; cm.dist.birdies++; }
      else if (diff === 0) { dist.pars++; cm.dist.pars++; }
      else if (diff === 1) { dist.bogeys++; cm.dist.bogeys++; }
      else { dist.doubles++; cm.dist.doubles++; }

      gross += score;
      net += score - strokeHoles[h];
      holes++;

      cGross += score;
      cNet += score - strokeHoles[h];
      cHoles++;

      if (h < 9) { front += score; frontH++; }
      else { back += score; backH++; }

      // Par type
      if (par === 3 || par === 4 || par === 5) {
        parType[par].sum += score;
        parType[par].count++;
      }
    }

    if (holes > 0) {
      grossSum += gross;
      netSum += net;
      validRounds++;

      if (frontH === 9) { frontSum += front; frontRounds++; }
      if (backH === 9) { backSum += back; backRounds++; }

      if (holes === 18) {
        if (gross < bestGross) { bestGross = gross; bestRound = { date: r.date, courseName: r.courseName, score: gross }; }
        if (gross > worstGross) { worstGross = gross; worstRound = { date: r.date, courseName: r.courseName, score: gross }; }
      }
    }

    if (cHoles > 0) {
      cm.grossSum += cGross;
      cm.grossRounds++;
      cm.netSum += cNet;
      cm.netRounds++;
    }
  }

  const byParType = {
    par3: parType[3].count > 0 ? { avg: (parType[3].sum / parType[3].count).toFixed(2), count: parType[3].count } : { avg: '--', count: 0 },
    par4: parType[4].count > 0 ? { avg: (parType[4].sum / parType[4].count).toFixed(2), count: parType[4].count } : { avg: '--', count: 0 },
    par5: parType[5].count > 0 ? { avg: (parType[5].sum / parType[5].count).toFixed(2), count: parType[5].count } : { avg: '--', count: 0 },
  };

  const byCourse = Object.values(courseMap).map(c => ({
    name: c.name,
    grossAvg: c.grossRounds > 0 ? (c.grossSum / c.grossRounds).toFixed(1) : '--',
    netAvg: c.netRounds > 0 ? (c.netSum / c.netRounds).toFixed(1) : '--',
    roundCount: c.grossRounds,
    distribution: c.dist,
  })).sort((a, b) => a.name.localeCompare(b.name));

  return {
    grossAvg: validRounds > 0 ? (grossSum / validRounds).toFixed(1) : '--',
    netAvg: validRounds > 0 ? (netSum / validRounds).toFixed(1) : '--',
    distribution: dist,
    front9Avg: frontRounds > 0 ? (frontSum / frontRounds).toFixed(1) : '--',
    back9Avg: backRounds > 0 ? (backSum / backRounds).toFixed(1) : '--',
    bestRound,
    worstRound,
    byParType,
    byCourse,
  };
}

// Per-game calcAll to avoid index-mismatch when some games return null.
function calcGameProfitability(processed) {
  const gameLabels = {
    stroke: 'Stroke', match: 'Match', skins: 'Skins',
    sixes: '6-6-6', vegas: 'Vegas', nines: '9s',
  };

  const byType = {};

  for (const r of processed) {
    for (const game of r.games) {
      try {
        const { results } = calcAll([game], r.players);
        if (results.length === 0) continue;
        const result = results[0];

        let playerNet = 0;
        for (const p of (result.payouts || [])) {
          if (p.t === r.playerIdx) playerNet += p.a;
          if (p.f === r.playerIdx) playerNet -= p.a;
        }

        const type = game.type;
        if (!byType[type]) byType[type] = { type, label: gameLabels[type] || type, net: 0, played: 0, won: 0 };
        byType[type].net += playerNet;
        byType[type].played++;
        if (playerNet > 0.005) byType[type].won++;
      } catch {
        continue;
      }
    }
  }

  const byTypeArr = Object.values(byType).map(g => ({
    ...g,
    net: Math.round(g.net * 100) / 100,
    avg: g.played > 0 ? (g.net / g.played).toFixed(2) : '0.00',
    winRate: g.played > 0 ? Math.round((g.won / g.played) * 100) : 0,
  })).sort((a, b) => b.net - a.net);

  const bestGame = byTypeArr.length > 0 ? byTypeArr[0] : null;
  const worstGame = byTypeArr.length > 0 ? byTypeArr[byTypeArr.length - 1] : null;

  return { byType: byTypeArr, bestGame, worstGame };
}

function calcSkinsStats(processed) {
  let totalWon = 0, totalGames = 0, totalEarnings = 0;
  let biggestSkin = 0;
  const byCourseMap = {};
  const byHole = Array(18).fill(0);
  // per-hole-per-course: key = `${courseName}:${hole}`
  const holeCourseMap = {};

  for (const r of processed) {
    for (const game of r.games) {
      if (game.type !== 'skins') continue;
      try {
        const { results } = calcAll([game], r.players);
        if (results.length === 0) continue;
        const result = results[0];

        totalGames++;

        for (const p of (result.payouts || [])) {
          if (p.t === r.playerIdx) totalEarnings += p.a;
          if (p.f === r.playerIdx) totalEarnings -= p.a;
        }

        for (const hr of (result.holeResults || [])) {
          if (hr.w === r.playerIdx && hr.v > 0) {
            totalWon += hr.v;
            if (hr.v > biggestSkin) biggestSkin = hr.v;
            if (hr.h >= 1 && hr.h <= 18) {
              byHole[hr.h - 1]++;
              const key = `${r.courseName}:${hr.h}`;
              holeCourseMap[key] = (holeCourseMap[key] || 0) + hr.v;
            }

            if (!byCourseMap[r.courseName]) byCourseMap[r.courseName] = { name: r.courseName, count: 0 };
            byCourseMap[r.courseName].count += hr.v;
          }
        }
      } catch {
        continue;
      }
    }
  }

  const winRate = totalGames > 0 ? Math.round((totalWon / (totalGames * 18)) * 100) : 0;
  const byCourse = Object.values(byCourseMap).sort((a, b) => b.count - a.count);
  const topHoleIdx = byHole.indexOf(Math.max(...byHole));
  const topHole = Math.max(...byHole) > 0 ? topHoleIdx + 1 : null;

  // Build byHoleByCourse: group by course, sort holes
  const courseHoleMap = {};
  for (const [key, count] of Object.entries(holeCourseMap)) {
    const colonIdx = key.lastIndexOf(':');
    const courseName = key.slice(0, colonIdx);
    const hole = parseInt(key.slice(colonIdx + 1), 10);
    if (!courseHoleMap[courseName]) courseHoleMap[courseName] = [];
    courseHoleMap[courseName].push({ hole, count });
  }
  const byHoleByCourse = Object.entries(courseHoleMap)
    .map(([courseName, holes]) => ({
      courseName,
      holes: holes.sort((a, b) => a.hole - b.hole),
    }))
    .sort((a, b) => a.courseName.localeCompare(b.courseName));

  return {
    totalWon,
    totalGames,
    winRate,
    biggestSkin,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    byCourse,
    byHole,
    topHole,
    byHoleByCourse,
  };
}

function calcHeadToHead(processed) {
  const opponents = {};
  const partners = {};

  for (const r of processed) {
    const { settlements } = r.calcResult || {};

    // Count appearances with each opponent
    for (let i = 0; i < r.players.length; i++) {
      if (i === r.playerIdx) continue;
      const opp = r.players[i];
      if (!opponents[opp.id]) opponents[opp.id] = { id: opp.id, name: opp.name, net: 0, rounds: 0 };
      opponents[opp.id].rounds++;
    }

    // Track net via settlements
    for (const s of (settlements || [])) {
      if (s.from === r.playerIdx) {
        const opp = r.players[s.to];
        if (opponents[opp.id]) opponents[opp.id].net -= s.amount;
      } else if (s.to === r.playerIdx) {
        const opp = r.players[s.from];
        if (opponents[opp.id]) opponents[opp.id].net += s.amount;
      }
    }

    // Partner tracking: inspect team game structures
    for (const game of r.games) {
      try {
        let partnerIdx = -1;

        if ((game.type === 'stroke' || game.type === 'match' || game.type === 'vegas') && game.team1) {
          // 2v2 team game: find which team playerIdx is on
          if (game.team1.includes(r.playerIdx)) {
            partnerIdx = game.team1.find(i => i !== r.playerIdx);
          } else if (game.team2 && game.team2.includes(r.playerIdx)) {
            partnerIdx = game.team2.find(i => i !== r.playerIdx);
          }
        } else if (game.type === 'sixes' && game.pairs) {
          // 6-6-6: pairs is array of { t1: [idx,idx], t2: [idx,idx] }
          for (const pair of game.pairs) {
            if (pair.t1 && pair.t1.includes(r.playerIdx)) {
              partnerIdx = pair.t1.find(i => i !== r.playerIdx);
              break;
            } else if (pair.t2 && pair.t2.includes(r.playerIdx)) {
              partnerIdx = pair.t2.find(i => i !== r.playerIdx);
              break;
            }
          }
        }

        if (partnerIdx !== -1 && partnerIdx !== undefined) {
          const partner = r.players[partnerIdx];
          if (!partner) continue;

          // Calculate player net for this specific game
          const { results } = calcAll([game], r.players);
          if (results.length === 0) continue;
          const result = results[0];
          let playerNet = 0;
          for (const p of (result.payouts || [])) {
            if (p.t === r.playerIdx) playerNet += p.a;
            if (p.f === r.playerIdx) playerNet -= p.a;
          }

          if (!partners[partner.id]) {
            partners[partner.id] = { id: partner.id, name: partner.name, teamGames: 0, teamNet: 0 };
          }
          partners[partner.id].teamGames++;
          partners[partner.id].teamNet += playerNet;
        }
      } catch {
        // skip game
      }
    }
  }

  const rivals = Object.values(opponents)
    .map(o => ({ ...o, net: Math.round(o.net * 100) / 100 }))
    .sort((a, b) => b.rounds - a.rounds);

  const byNet = [...rivals].sort((a, b) => b.net - a.net);
  const bestRival = byNet.length > 0 ? byNet[0] : null;
  const worstRival = byNet.length > 0 ? byNet[byNet.length - 1] : null;
  const mostFrequent = rivals.length > 0 ? rivals[0] : null;

  const partnerArr = Object.values(partners)
    .map(p => ({ ...p, teamNet: Math.round(p.teamNet * 100) / 100 }))
    .sort((a, b) => b.teamNet - a.teamNet);

  const bestPartner = partnerArr.length > 0 ? partnerArr[0] : null;
  const worstPartner = partnerArr.length > 0 ? partnerArr[partnerArr.length - 1] : null;

  return {
    rivalries: rivals.slice(0, 5),
    bestRival,
    worstRival,
    mostFrequent,
    partners: partnerArr,
    bestPartner,
    worstPartner,
  };
}

function calcCoursePerformance(processed) {
  const byCourseMap = {};

  for (const r of processed) {
    if (!byCourseMap[r.courseName]) {
      byCourseMap[r.courseName] = { name: r.courseName, net: 0, roundCount: 0, grossSum: 0, grossRounds: 0 };
    }
    const c = byCourseMap[r.courseName];
    c.roundCount++;

    const balances = r.calcResult?.balances;
    if (balances && balances[r.playerIdx] !== undefined) {
      c.net += -balances[r.playerIdx];
    }

    if (r.pars) {
      const player = r.players[r.playerIdx];
      const scores = player.scores || [];
      let gross = 0, holes = 0;
      for (let h = 0; h < 18; h++) {
        if (scores[h] != null) { gross += scores[h]; holes++; }
      }
      if (holes > 0) { c.grossSum += gross; c.grossRounds++; }
    }
  }

  const byCourse = Object.values(byCourseMap).map(c => ({
    name: c.name,
    net: Math.round(c.net * 100) / 100,
    roundCount: c.roundCount,
    grossAvg: c.grossRounds > 0 ? (c.grossSum / c.grossRounds).toFixed(1) : '--',
  })).sort((a, b) => b.net - a.net);

  return {
    byCourse,
    bestCourse: byCourse.length > 0 ? byCourse[0] : null,
    worstCourse: byCourse.length > 0 ? byCourse[byCourse.length - 1] : null,
  };
}

function calcTrends(processed) {
  const sorted = [...processed].sort((a, b) => new Date(a.date) - new Date(b.date));

  let cumulative = 0;
  const earningsOverTime = sorted.map(r => {
    const balances = r.calcResult?.balances;
    const earnings = (balances && balances[r.playerIdx] !== undefined) ? -balances[r.playerIdx] : 0;
    cumulative += earnings;
    return { date: r.date, value: Math.round(cumulative * 100) / 100 };
  });

  const allEarnings = sorted.map(r => {
    const balances = r.calcResult?.balances;
    return (balances && balances[r.playerIdx] !== undefined) ? -balances[r.playerIdx] : 0;
  });

  const allTimeAvg = allEarnings.length > 0
    ? allEarnings.reduce((a, b) => a + b, 0) / allEarnings.length
    : 0;
  const recent5 = allEarnings.slice(-5);
  const recentAvg = recent5.length > 0 ? recent5.reduce((a, b) => a + b, 0) / recent5.length : 0;

  const lifetimeTotal = earningsOverTime.length > 0
    ? earningsOverTime[earningsOverTime.length - 1].value
    : 0;

  return {
    earningsOverTime,
    lifetimeTotal,
    allTimeAvg,
    recentAvg,
    recentForm: recentAvg > allTimeAvg + 0.01 ? 'hot' : recentAvg < allTimeAvg - 0.01 ? 'cold' : 'neutral',
  };
}

function calcFunStats(processed) {
  const sorted = [...processed].sort((a, b) => new Date(a.date) - new Date(b.date));

  let longestWinStreak = 0, longestLoseStreak = 0;
  let biggestWin = 0, biggestLoss = 0;
  let curWin = 0, curLose = 0;

  for (const r of sorted) {
    const balances = r.calcResult?.balances;
    const earnings = (balances && balances[r.playerIdx] !== undefined) ? -balances[r.playerIdx] : 0;

    if (earnings > 0.005) {
      curWin++; curLose = 0;
      if (curWin > longestWinStreak) longestWinStreak = curWin;
      if (earnings > biggestWin) biggestWin = earnings;
    } else if (earnings < -0.005) {
      curLose++; curWin = 0;
      if (curLose > longestLoseStreak) longestLoseStreak = curLose;
      if (Math.abs(earnings) > biggestLoss) biggestLoss = Math.abs(earnings);
    } else {
      curWin = 0; curLose = 0;
    }
  }

  const currentStreak = curWin > 0 ? curWin : curLose > 0 ? curLose : 0;
  const currentStreakType = curWin > 0 ? 'win' : curLose > 0 ? 'lose' : 'none';

  return {
    longestWinStreak,
    longestLoseStreak,
    currentStreak,
    currentStreakType,
    biggestWin: Math.round(biggestWin * 100) / 100,
    biggestLoss: Math.round(biggestLoss * 100) / 100,
  };
}
