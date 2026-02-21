# Premium Stats Phase 1.5 — Enhancements Plan

## Context

Phase 1 shipped the Stats page with hero card + 5 collapsible premium cards (Scoring, Games, Skins, H2H, Courses). User feedback and testing revealed several gaps:

1. **Skins card** only shows total skins per course — needs per-hole-per-course breakdown (e.g., "Hole 7 at Pine Hills: 3 skins won")
2. **Head-to-Head** doesn't distinguish partners from opponents — needs "Best partner" and "Worst partner" tracking using team game data (`game.team1`/`game.team2`/`game.pairs`)
3. **Scoring card** is all-courses-combined only — needs a course filter dropdown to view stats for a single course
4. **Premium features are buried** — currently 3 taps deep (Profile → Earnings → View Full Stats). Needs a teaser card on the Home page and a nav entry point
5. **No time-period filter** — stats are lifetime-only, needs Lifetime / YTD / per-year filtering
6. **Missing popular stats** — scoring by par type (par 3/4/5 avg), expanded streaks/records board, recent form indicator

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/statsCalc.js` | Add partner tracking, skins per-hole-per-course, scoring by par type, scoring by course, time filter support |
| `src/components/Stats.jsx` | Time filter UI, course dropdown on Scoring, skins per-hole-per-course display, partner section on H2H, par type stats, records board, recent form |
| `src/components/Home.jsx` | Add stats teaser card |
| `src/components/Nav.jsx` | Add Stats nav icon |
| `src/App.jsx` | Update nav to pass stats-relevant props, update back-button for stats from nav |

No new files needed.

---

## Implementation Steps

### Step 1: Time Period Filter in statsCalc.js

Add a `timePeriod` parameter to `calcAllStats`:

```js
export function calcAllStats(linkedPlayerId, rounds, tournamentHistory, timePeriod = 'lifetime')
```

`timePeriod` values: `'lifetime'`, `'ytd'`, or a 4-digit year string like `'2025'`.

**In `processRounds()`**, after building the full array, filter by date:
- `'lifetime'` → no filter
- `'ytd'` → `new Date(r.date).getFullYear() === currentYear`
- `'2025'` → `new Date(r.date).getFullYear() === 2025`

Also return `availableYears` (sorted desc, deduped from all rounds) so the UI can render year options.

The return shape gains one field:
```js
{ roundCount, scoring, games, skins, h2h, courses, trends, fun, availableYears }
```

### Step 2: Scoring by Par Type + Scoring by Course

**In `calcScoringStats()`**, add two new return fields:

```js
scoring: {
  ...existing,
  byParType: { par3: { avg, count }, par4: { avg, count }, par5: { avg, count } },
  byCourse: [{ name, grossAvg, netAvg, roundCount, distribution }]
}
```

**byParType logic:** For each hole with a score, bucket by `pars[h]` (3, 4, or 5). Track gross total and count per bucket. Compute average.

**byCourse logic:** Group scoring rounds by `r.courseName`. For each course, compute grossAvg, netAvg, roundCount, and its own distribution object `{eagles, birdies, pars, bogeys, doubles}`.

### Step 3: Skins Per-Hole-Per-Course

**In `calcSkinsStats()`**, replace the flat `byHole` array with a nested structure:

```js
skins: {
  ...existing,
  byHoleByCourse: [{ courseName, holes: [{hole: 1, count: 2}, ...] }]
}
```

**Logic:** Instead of `byHole[hr.h - 1]++`, build a map keyed by `r.courseName + ':' + hr.h`. Then reshape into the nested array sorted by course name, with holes sorted by hole number. Only include holes where `count > 0`.

Keep the existing `byHole` flat array and `topHole` for the summary. The `byHoleByCourse` is the expanded detail.

### Step 4: Partner Tracking in Head-to-Head

**In `calcHeadToHead()`**, add partner analysis by inspecting team game structures.

For each processed round, iterate `r.games`:
- **Stroke 2v2** (`game.type === 'stroke' && game.team1`): If playerIdx is in `game.team1`, partner is the other index in `game.team1`. Same for `team2`.
- **Match 2v2** (`game.type === 'match' && game.team1`): Same team logic.
- **Vegas** (`game.type === 'vegas' && game.team1`): Same team logic.
- **6-6-6** (`game.type === 'sixes' && game.pairs`): For each pair segment, check if playerIdx is in `pair.t1` or `pair.t2`. Partner is the other index in the same team array.

For each identified partner, run `calcAll([game], r.players)` and extract the player's net for that game. Accumulate per-partner: `{ name, teamGames, teamNet }`.

Return shape adds to h2h:
```js
h2h: {
  ...existing,
  partners: [{ id, name, teamGames, teamNet }]  // sorted by teamNet desc
  bestPartner: { id, name, teamGames, teamNet },
  worstPartner: { id, name, teamGames, teamNet }
}
```

### Step 5: Expanded Fun Stats / Records Board

**In `calcFunStats()`**, add:
- `mostSkinsOneGame` — iterate skins results, find max skins count in a single game
- `biggestSkinValue` — max carry value from any single skin (already tracked as `biggestSkin` in skins stats, so just reference it)

No major new calc needed — mostly about displaying what we have more prominently.

### Step 6: Stats.jsx — Time Period Filter UI

Add state: `const [period, setPeriod] = useState('lifetime')`

Pass `period` to `calcAllStats`. The `useMemo` deps include `period`.

Render a row of filter pills at the top of the page (below header, above hero):
```
[Lifetime] [YTD] [2025] [2024] ...
```
Style: horizontal scrollable row of `.tag` pills. Active pill uses `.tg` (green). Inactive uses dim border style. Years come from `stats.availableYears`.

**Important:** Compute `availableYears` from the *unfiltered* round list (before time filtering) so the year pills are always visible. Pass it separately or compute once at the top of `calcAllStats` before filtering.

### Step 7: Stats.jsx — Scoring Card Updates

In expanded `ScoringCard`:

**Course filter dropdown** at top of expanded area:
```jsx
<select value={courseFilter} onChange={...}>
  <option value="all">All Courses</option>
  {stats.byCourse.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
</select>
```

When a course is selected, display that course's specific stats (grossAvg, netAvg, distribution, roundCount) instead of the overall ones. The bars and numbers reactively update.

**Scoring by par type** (new section in expanded area, below distribution bars):
```
Par 3s: avg 3.8 (42 holes)
Par 4s: avg 5.1 (84 holes)
Par 5s: avg 5.9 (42 holes)
```
Three rows with the par type, average score, and hole count. Color the average green if below par+1, gold if above.

**Recent form indicator** (new section):
```
Recent Form: ↑ Hot  (+$12.40/round vs +$4.20 lifetime avg)
```
Single line with arrow (↑ green for hot, ↓ red for cold, → neutral). Uses `trends.recentForm`, `trends.recentAvg`, and `trends.allTimeAvg`.

### Step 8: Stats.jsx — Skins Card Updates

In expanded `SkinsCard`, after the existing "By Course" section, add:

**Per-hole-per-course breakdown:**
For each course in `byHoleByCourse`, show course name as a sub-header, then a compact grid/list of holes won:
```
Pine Hills
  Hole 3: 2 skins · Hole 7: 3 skins · Hole 14: 1 skin
Oak Creek
  Hole 1: 1 skin · Hole 9: 2 skins
```

Use inline flow layout (flex-wrap) with small tag-style chips for each hole.

### Step 9: Stats.jsx — H2H Card Updates

In the `H2HCard` summary (always visible):
```
Best partner: Mike (+$85 in 12 team games)
Rival: Steve (12 rounds, you +$45)
```

In expanded area, add a **Partners** section before the existing **Top Opponents** section:
```
── Partners ──
Mike: 12 team games, +$85.00
Dave: 8 team games, +$32.00
Steve: 6 team games, -$15.00
```

Each row shows: name, team game count, and team net (green/red colored). Sorted by teamNet desc.

### Step 10: Stats.jsx — Records Board

Add a new card at the bottom of the premium section (card index 5):

```jsx
<RecordsCard stats={stats} exp={exp === 5} toggle={() => toggle(5)} />
```

Summary: `Best: +$XX single round · X-round win streak`

Expanded detail:
- Biggest single-round win: amount + date + course
- Biggest single-round loss: amount + date + course
- Longest win streak: X rounds
- Longest losing streak: X rounds
- Current streak: X-round win/loss
- Recent form line (hot/cold/neutral with avg comparison)

### Step 11: Home Page Stats Teaser Card

**In `Home.jsx`**, add a new card after the active round/tournament cards but before the "New Round" section. Only shows if `profile?.linked_player_id` exists.

```jsx
{profile?.linked_player_id && (
  <div className="cd" onClick={() => go('stats')} style={{ cursor: 'pointer' }}>
    <div className="fxb">
      <span className="ct" style={{ marginBottom: 0 }}>Your Stats</span>
      <span style={{ color: T.dim, fontSize: 14 }}>▸</span>
    </div>
    {/* Mini stats row: 3 key numbers */}
    <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
      <StatPill label="Earnings" value={fmt$(lifetimeTotal)} color={...} />
      <StatPill label="Rounds" value={roundCount} />
      <StatPill label="Streak" value={streakText} color={...} />
    </div>
  </div>
)}
```

**Props needed:** Home.jsx will need `profile` and either pre-computed quick stats OR `rounds`/`tournamentHistory` to compute inline. To avoid heavy computation on every Home render, pass the already-computed `calcAllStats` result from App.jsx (memoized there) or compute just the 3 hero numbers with a lightweight function.

**Recommended approach:** Add a `quickStats` prop computed in App.jsx via `useMemo`. This is a lighter version that only computes lifetime total, round count, and current streak — reusing `processRounds` + `calcTrends` + `calcFunStats` from statsCalc.js. Or simply pass the full stats object and destructure what's needed.

For **free users**: The card still shows but with blurred values and a gold "Unlock" badge, enticing them to tap through to the full stats page.

### Step 12: Nav Bar — Add Stats Icon

In `Nav.jsx`, add a stats/chart icon between History and Profile:

```jsx
<button className={`ni ${pg === "stats" ? "on" : ""}`} onClick={() => go("stats")}>
  <span className="nii">{ICN.stats}</span>Stats
</button>
```

New icon (`ICN.stats`): a simple bar chart SVG (3 bars of different heights). This is a standard analytics icon that communicates "stats" clearly.

Update **App.jsx** back button: when on `stats` page from nav, back goes to `home` (not profile). Since the user can now reach stats from both Profile *and* Nav, the back button should go to `home` (universal safe target).

The nav goes from 5 always-visible items (Home, Players, Courses, History, Profile) + 1 conditional (Score) to **6 always-visible + 1 conditional**. On a 480px screen with 7 items that's ~68px each — tight but workable, and the Score button only shows during active rounds so most of the time it's 6 items at ~80px each.

---

## Verification

1. **Build + lint** — `npm run build && npm run lint` must pass
2. **Test time filter:** Switch between Lifetime / YTD / year — all stats should update, cards reflect filtered data
3. **Test scoring course filter:** Expand Scoring card → select a specific course → stats change to that course's data
4. **Test scoring by par type:** Shows correct averages for par 3s/4s/5s
5. **Test skins per-hole-per-course:** Expand Skins → shows which holes at which courses you've won skins
6. **Test partner tracking:** H2H card shows "Best partner" in summary, Partners section in expanded view with team game stats
7. **Test records board:** Shows biggest win/loss, streaks, recent form
8. **Test home teaser card:** Home page shows mini stats card, tapping navigates to Stats page
9. **Test nav icon:** Stats icon in nav, highlights when on stats page
10. **Test free user flow:** Home card values are blurred, Stats page still shows premium gate overlay on premium cards
11. **Push to dev** → test on Vercel preview URL
