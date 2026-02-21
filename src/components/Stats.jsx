import { useState, useMemo } from 'react';
import { T } from '../theme';
import { calcAllStats } from '../utils/statsCalc';
import { fmt$ } from '../utils/golf';
import PremiumGate from './PremiumGate';

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
const Sparkline = ({ data }) => {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * 100;
    const y = 90 - ((v - min) / range) * 80;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const isPos = vals[vals.length - 1] >= 0;
  // Zero line
  const zeroY = 90 - ((0 - min) / range) * 80;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ width: '100%', height: 56, display: 'block', marginTop: 10 }}
    >
      {min < 0 && max > 0 && (
        <line x1="0" y1={zeroY} x2="100" y2={zeroY} stroke={T.bdr} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      )}
      <polyline
        points={pts}
        fill="none"
        stroke={isPos ? T.accB : T.red}
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

// ─── Score distribution dot ───────────────────────────────────────────────────
const Dot = ({ color, count, label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginRight: 8 }}>
    <span title={label} style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
    <span style={{ fontSize: 12, color: T.txt, fontWeight: 600 }}>{count}</span>
  </span>
);

// ─── Horizontal bar row ───────────────────────────────────────────────────────
const BarRow = ({ label, count, maxCount, color }) => {
  const pct = maxCount > 0 ? Math.max(6, Math.round((count / maxCount) * 100)) : 6;
  return (
    <div className="st-bar-row">
      <span className="st-bar-lbl" style={{ color: T.txt }}>{label}</span>
      <div style={{ flex: 1 }}>
        <div className="st-bar" style={{ width: `${pct}%`, background: color, color: T.bg }}>
          {count >= 3 ? count : ''}
        </div>
      </div>
      <span className="st-bar-ct" style={{ color: T.txt }}>{count}</span>
    </div>
  );
};

// ─── Hero Card ────────────────────────────────────────────────────────────────
const HeroCard = ({ stats }) => {
  const total = stats.trends.lifetimeTotal;
  const isPos = total >= 0;
  const streak = stats.fun.currentStreak;
  const streakType = stats.fun.currentStreakType;
  const streakText = streak > 0
    ? `${streak}-round ${streakType === 'win' ? 'win' : 'loss'} streak`
    : 'No current streak';

  return (
    <div className="cd">
      <div className="tkt" style={{ marginBottom: 8 }}>Lifetime Earnings</div>
      <div className="st-num" style={{ color: isPos ? T.accB : T.red, textAlign: 'center' }}>
        {fmt$(total)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 6 }}>
        <span style={{ fontSize: 13, color: T.dim }}>{stats.roundCount} round{stats.roundCount !== 1 ? 's' : ''}</span>
        <span style={{ fontSize: 13, color: T.dim }}>·</span>
        <span style={{ fontSize: 13, color: streakType === 'win' ? T.accB : streakType === 'lose' ? T.red : T.dim }}>
          {streakText}
        </span>
      </div>
      <Sparkline data={stats.trends.earningsOverTime} />
    </div>
  );
};

// ─── Scoring Card ─────────────────────────────────────────────────────────────
const ScoringCard = ({ stats, exp, toggle }) => {
  const d = stats.distribution;
  const total = d.eagles + d.birdies + d.pars + d.bogeys + d.doubles;
  const maxCount = Math.max(d.eagles, d.birdies, d.pars, d.bogeys, d.doubles);

  return (
    <div className="cd" onClick={toggle} style={{ cursor: 'pointer' }}>
      <div className="fxb">
        <span className="ct" style={{ marginBottom: 0 }}>Scoring</span>
        <span style={{ color: T.dim, fontSize: 16 }}>{exp ? '▾' : '▸'}</span>
      </div>
      <div style={{ fontSize: 14, color: T.dim, marginTop: 6 }}>
        Avg: <span style={{ color: T.txt }}>{stats.grossAvg}</span> gross · <span style={{ color: T.txt }}>{stats.netAvg}</span> net
      </div>
      {total > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap' }}>
          <Dot color={T.blue} count={d.eagles} label="Eagles" />
          <Dot color={T.accB} count={d.birdies} label="Birdies" />
          <Dot color="#e8f5e9" count={d.pars} label="Pars" />
          <Dot color={T.gold} count={d.bogeys} label="Bogeys" />
          <Dot color={T.red} count={d.doubles} label="Dbl+" />
        </div>
      )}
      {exp && (
        <div style={{ marginTop: 16 }} onClick={e => e.stopPropagation()}>
          <div className="dvd" style={{ marginBottom: 12 }} />
          {/* Distribution bars */}
          {total > 0 ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: T.dim, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Score Distribution</div>
              <BarRow label="Eagle" count={d.eagles} maxCount={maxCount} color={T.blue} />
              <BarRow label="Birdie" count={d.birdies} maxCount={maxCount} color={T.accB} />
              <BarRow label="Par" count={d.pars} maxCount={maxCount} color="#3d6b50" />
              <BarRow label="Bogey" count={d.bogeys} maxCount={maxCount} color={T.gold} />
              <BarRow label="Dbl+" count={d.doubles} maxCount={maxCount} color={T.red} />
            </div>
          ) : (
            <div style={{ color: T.dim, fontSize: 13, marginBottom: 12 }}>No score data yet</div>
          )}
          {/* Front/back */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div className="cd" style={{ flex: 1, margin: 0, textAlign: 'center', padding: 12 }}>
              <div style={{ fontSize: 11, color: T.dim, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.4px' }}>Front 9</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.txt }}>{stats.front9Avg}</div>
            </div>
            <div className="cd" style={{ flex: 1, margin: 0, textAlign: 'center', padding: 12 }}>
              <div style={{ fontSize: 11, color: T.dim, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.4px' }}>Back 9</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.txt }}>{stats.back9Avg}</div>
            </div>
          </div>
          {/* Best/worst */}
          {stats.bestRound && (
            <div className="fxb" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: T.dim }}>Best round</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.accB }}>{stats.bestRound.score} at {stats.bestRound.courseName}</span>
            </div>
          )}
          {stats.worstRound && (
            <div className="fxb">
              <span style={{ fontSize: 13, color: T.dim }}>Worst round</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.red }}>{stats.worstRound.score} at {stats.worstRound.courseName}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Games Card ───────────────────────────────────────────────────────────────
const GamesCard = ({ stats, exp, toggle }) => {
  const { byType, bestGame, worstGame } = stats;
  const hasGames = byType.length > 0;

  return (
    <div className="cd" onClick={toggle} style={{ cursor: 'pointer' }}>
      <div className="fxb">
        <span className="ct" style={{ marginBottom: 0 }}>Games</span>
        <span style={{ color: T.dim, fontSize: 16 }}>{exp ? '▾' : '▸'}</span>
      </div>
      {hasGames ? (
        <div style={{ fontSize: 14, color: T.dim, marginTop: 6 }}>
          Best: <span style={{ color: T.accB }}>{bestGame?.label}</span>{bestGame && ` (${fmt$(bestGame.net)})`}
          {worstGame && worstGame.type !== bestGame?.type && (
            <> · Worst: <span style={{ color: T.red }}>{worstGame.label}</span> ({fmt$(worstGame.net)})</>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 14, color: T.dim, marginTop: 6 }}>No games played yet</div>
      )}
      {exp && hasGames && (
        <div style={{ marginTop: 16 }} onClick={e => e.stopPropagation()}>
          <div className="dvd" style={{ marginBottom: 12 }} />
          {byType.map(g => {
            const isPos = g.net >= 0;
            return (
              <div key={g.type} className="fxb" style={{ padding: '10px 0', borderBottom: `1px solid ${T.bdr}` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.txt }}>{g.label}</div>
                  <div style={{ fontSize: 12, color: T.dim, marginTop: 2 }}>
                    {g.played} game{g.played !== 1 ? 's' : ''} · {g.winRate}% win rate
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: isPos ? T.accB : T.red }}>{fmt$(g.net)}</div>
                  <div style={{ fontSize: 12, color: T.dim }}>avg {fmt$(parseFloat(g.avg))}/game</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Skins Card ───────────────────────────────────────────────────────────────
const SkinsCard = ({ stats, exp, toggle }) => {
  const hasData = stats.totalGames > 0;

  return (
    <div className="cd" onClick={toggle} style={{ cursor: 'pointer' }}>
      <div className="fxb">
        <span className="ct" style={{ marginBottom: 0 }}>Skins</span>
        <span style={{ color: T.dim, fontSize: 16 }}>{exp ? '▾' : '▸'}</span>
      </div>
      {hasData ? (
        <>
          <div style={{ fontSize: 14, color: T.dim, marginTop: 6 }}>
            <span style={{ color: T.txt }}>{stats.totalWon}</span> skins won
            {stats.biggestSkin > 1 && <> · Biggest: <span style={{ color: T.gold }}>{stats.biggestSkin}x carry</span></>}
          </div>
          <div style={{ fontSize: 13, color: T.dim, marginTop: 3 }}>
            {stats.winRate}% win rate across {stats.totalGames} game{stats.totalGames !== 1 ? 's' : ''}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 14, color: T.dim, marginTop: 6 }}>No skins games played yet</div>
      )}
      {exp && hasData && (
        <div style={{ marginTop: 16 }} onClick={e => e.stopPropagation()}>
          <div className="dvd" style={{ marginBottom: 12 }} />
          <div className="fxb" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: T.dim }}>Total earnings</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: stats.totalEarnings >= 0 ? T.accB : T.red }}>
              {fmt$(stats.totalEarnings)}
            </span>
          </div>
          {stats.topHole && (
            <div className="fxb" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: T.dim }}>Best hole</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.txt }}>Hole {stats.topHole}</span>
            </div>
          )}
          {stats.byCourse.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: T.dim, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>By Course</div>
              {stats.byCourse.map(c => (
                <div key={c.name} className="fxb" style={{ padding: '8px 0', borderBottom: `1px solid ${T.bdr}` }}>
                  <span style={{ fontSize: 13, color: T.txt }}>{c.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.gold }}>{c.count} skin{c.count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Head-to-Head Card ────────────────────────────────────────────────────────
const H2HCard = ({ stats, exp, toggle }) => {
  const { rivalries, bestRival, mostFrequent } = stats;
  const hasData = rivalries.length > 0;

  return (
    <div className="cd" onClick={toggle} style={{ cursor: 'pointer' }}>
      <div className="fxb">
        <span className="ct" style={{ marginBottom: 0 }}>Head-to-Head</span>
        <span style={{ color: T.dim, fontSize: 16 }}>{exp ? '▾' : '▸'}</span>
      </div>
      {hasData ? (
        <>
          {bestRival && (
            <div style={{ fontSize: 14, color: T.dim, marginTop: 6 }}>
              Best vs: <span style={{ color: T.accB }}>{bestRival.name}</span> ({fmt$(bestRival.net)})
            </div>
          )}
          {mostFrequent && (
            <div style={{ fontSize: 13, color: T.dim, marginTop: 3 }}>
              Most played with: <span style={{ color: T.txt }}>{mostFrequent.name}</span> ({mostFrequent.rounds} round{mostFrequent.rounds !== 1 ? 's' : ''})
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 14, color: T.dim, marginTop: 6 }}>No round data yet</div>
      )}
      {exp && hasData && (
        <div style={{ marginTop: 16 }} onClick={e => e.stopPropagation()}>
          <div className="dvd" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 12, color: T.dim, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Top Opponents</div>
          {rivalries.map(r => {
            const isPos = r.net >= 0;
            return (
              <div key={r.id} className="fxb" style={{ padding: '10px 0', borderBottom: `1px solid ${T.bdr}` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.txt }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: T.dim }}>{r.rounds} round{r.rounds !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: isPos ? T.accB : T.red }}>
                  {fmt$(r.net)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Courses Card ─────────────────────────────────────────────────────────────
const CoursesCard = ({ stats, exp, toggle }) => {
  const { byCourse, bestCourse, worstCourse } = stats;
  const hasData = byCourse.length > 0;

  return (
    <div className="cd" onClick={toggle} style={{ cursor: 'pointer' }}>
      <div className="fxb">
        <span className="ct" style={{ marginBottom: 0 }}>Courses</span>
        <span style={{ color: T.dim, fontSize: 16 }}>{exp ? '▾' : '▸'}</span>
      </div>
      {hasData ? (
        <>
          {bestCourse && (
            <div style={{ fontSize: 14, color: T.dim, marginTop: 6 }}>
              Best: <span style={{ color: T.accB }}>{bestCourse.name}</span> ({fmt$(bestCourse.net)}, {bestCourse.roundCount} round{bestCourse.roundCount !== 1 ? 's' : ''})
            </div>
          )}
          {worstCourse && worstCourse.name !== bestCourse?.name && (
            <div style={{ fontSize: 13, color: T.dim, marginTop: 3 }}>
              Worst: <span style={{ color: T.red }}>{worstCourse.name}</span> ({fmt$(worstCourse.net)})
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 14, color: T.dim, marginTop: 6 }}>No course data yet</div>
      )}
      {exp && hasData && (
        <div style={{ marginTop: 16 }} onClick={e => e.stopPropagation()}>
          <div className="dvd" style={{ marginBottom: 12 }} />
          {byCourse.map(c => {
            const isPos = c.net >= 0;
            return (
              <div key={c.name} style={{ padding: '10px 0', borderBottom: `1px solid ${T.bdr}` }}>
                <div className="fxb">
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.txt }}>{c.name}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: isPos ? T.accB : T.red }}>{fmt$(c.net)}</span>
                </div>
                <div className="fxb" style={{ marginTop: 3 }}>
                  <span style={{ fontSize: 12, color: T.dim }}>{c.roundCount} round{c.roundCount !== 1 ? 's' : ''}</span>
                  {c.grossAvg !== '--' && (
                    <span style={{ fontSize: 12, color: T.dim }}>avg {c.grossAvg}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Stats Page ──────────────────────────────────────────────────────────
const Stats = ({ profile, rounds, tournamentHistory, go }) => {
  const [exp, setExp] = useState(null);

  const stats = useMemo(
    () => calcAllStats(profile?.linked_player_id, rounds, tournamentHistory),
    [profile?.linked_player_id, rounds, tournamentHistory]
  );

  if (!profile?.linked_player_id) {
    return (
      <div className="pg">
        <div className="cd" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⛳</div>
          <div style={{ fontSize: 15, color: T.txt, fontWeight: 600, marginBottom: 8 }}>Link a player to see stats</div>
          <div style={{ fontSize: 13, color: T.dim, marginBottom: 20 }}>
            Go to Profile and link your account to a player on the roster
          </div>
          <button className="btn bp" onClick={() => go('profile')}>Go to Profile</button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="pg">
        <div className="cd" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏌️</div>
          <div style={{ fontSize: 15, color: T.txt, fontWeight: 600, marginBottom: 8 }}>No rounds yet</div>
          <div style={{ fontSize: 13, color: T.dim }}>
            Play some rounds to start tracking your stats
          </div>
        </div>
      </div>
    );
  }

  const toggle = i => setExp(exp === i ? null : i);

  return (
    <div className="pg">
      <HeroCard stats={stats} />

      <div className="tkt" style={{ margin: '16px 0 8px' }}>Premium Stats</div>

      <PremiumGate profile={profile}>
        <ScoringCard stats={stats.scoring} exp={exp === 0} toggle={() => toggle(0)} />
        <GamesCard stats={stats.games} exp={exp === 1} toggle={() => toggle(1)} />
        <SkinsCard stats={stats.skins} exp={exp === 2} toggle={() => toggle(2)} />
        <H2HCard stats={stats.h2h} exp={exp === 3} toggle={() => toggle(3)} />
        <CoursesCard stats={stats.courses} exp={exp === 4} toggle={() => toggle(4)} />
      </PremiumGate>
    </div>
  );
};

export default Stats;
