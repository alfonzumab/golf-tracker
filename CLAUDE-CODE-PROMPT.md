# Golf Tracker — Claude Code Migration Guide

## Step 1: Copy the Source File Into Your Project

Before running Claude Code, manually copy the monolith file into your project:

```bash
cp ~/Downloads/golf-tracker-phase3.jsx ~/golf-tracker/src/golf-tracker-phase3.jsx
```

(Adjust the path if your download went somewhere else)

---

## Step 2: Claude Code Prompt

Open Claude Code in your `~/golf-tracker` directory and paste this:

---

I have a golf round tracker app that's currently a single 1,228-line React component in `src/golf-tracker-phase3.jsx`. I need you to migrate it into this Vite + React project with proper structure. Here's what to do:

### 1. Project Structure
Split the monolith into this structure:

```
src/
  App.jsx              — Main app shell, state management, routing
  main.jsx             — Entry point (already exists, update it)
  theme.js             — T color constants object
  styles.css           — The CSS string converted to a real CSS file
  utils/
    calc.js            — calcAll, cStroke, cMatch, cSkins, cSixes functions
    golf.js            — calcCH, getStrokes, sixPairs, fmt$, scoreClass
    storage.js         — sv() and ld() functions (keep localStorage for now)
  components/
    Nav.jsx            — Bottom navigation bar + ICN icons
    Modal.jsx          — Mdl component
    Toggle.jsx         — Tog component
    Home.jsx           — Home page component
    Players.jsx        — Players management page
    Courses.jsx        — Courses page + CourseEditor
    Setup.jsx          — Game setup page
    Scoring.jsx        — Scoring page (hole view + card view)
    Bets.jsx           — Bets & settlement page
    History.jsx        — Round history page
```

### 2. Key Technical Details
- The app uses custom CSS classes (not Tailwind utilities yet) — the CSS is a template literal string in the `CSS` constant. Convert it to a regular `.css` file and import it.
- The `T` theme object is referenced throughout all components for inline styles. Export it from `theme.js`.
- Constants: `GT` (game types), `PC` (player colors) — put these in a `constants.js` or in `theme.js`.
- Storage functions `sv(key, data)` and `ld(key, fallback)` use localStorage with `gt3-` prefix. Keep them working as-is but isolate them in `storage.js` so we can swap to Supabase later.
- The calc engine (`calcAll`, `cStroke`, `cMatch`, `cSkins`, `cSixes`) is pure logic with no React — perfect for a separate utility file.
- Golf math helpers (`calcCH`, `getStrokes`, `sixPairs`, `fmt$`, `scoreClass`) are also pure functions.
- Google Fonts (Playfair Display + DM Sans) — add the import to `index.html` instead of the CSS `@import`.
- The app uses inline SVGs for nav icons (defined in the `ICN` object).

### 3. App State (in App.jsx)
The main App component manages:
- `pg` — current page string ("home", "score", "bets", "players", "courses", "hist", "setup")
- `players` — player roster array
- `courses` — course data array
- `selectedCourseId` — active course selection
- `round` — current active round (or null)
- `rounds` — completed round history array
- `setup` / `setupCourse` — temporary state during game setup flow
- `modal` — modal dialog state

Pass these as props to child components. No context/Redux needed — the prop drilling is manageable.

### 4. Don't Change Any Logic
The payout calculations, scoring, handicap math, etc. are all correct and tested. Don't modify any calculation logic — just move it to the right files. The app should work identically after migration.

### 5. Tailwind Setup
Tailwind is installed but not configured yet. For now, just make sure the existing custom CSS works. We'll migrate to Tailwind utilities in a future pass.

### 6. Update index.html
Add the Google Fonts link:
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
```

### 7. Verify It Works
After splitting everything, run `npm run dev` and verify:
- Home page loads, shows course/player selection
- Can navigate between all pages
- All localStorage data persists
- No console errors

---

## Step 3: After Claude Code Finishes

Once the migration is done, commit and push:

```bash
git add .
git commit -m "migrate monolith to component structure"
git push
```

---

## Future Steps (we'll do these next)

1. **Supabase Integration** — Replace `storage.js` with Supabase client calls
2. **Auth** — Add Supabase email auth so each user has their own data
3. **Deploy to Vercel** — Connect GitHub repo for auto-deploy
4. **PWA** — Add service worker for offline mobile use
