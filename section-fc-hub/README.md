# Sectioned Clubs

The club hub for grassroots football. Multi-tenant SaaS where any team can sign up and get a branded hub for matchday lineups, league tables, stats, match reports, predictors, and a skills combine.

Built with React + Vite + Firebase (Auth + Firestore).

---

## What you get per club

- **Club home** — branded with your colors, crest, and tagline
- **Squad management** — add players, positions, numbers, photo URLs
- **Fixtures & results** — upcoming games and historical results
- **League table** — fully editable standings, your club highlighted
- **Stats** — season and all-time goals, assists, cards, MOTM, clean sheets
- **Player form** — rolling 5-game rating history with color-coded cards
- **Hall of Fame** — default awards (Golden Boot, Assist King, etc.) plus fully custom awards
- **Match Predictor** — weekly score prediction + MOTM prop bet, season leaderboard
- **Match Reports** — one-click post-match workflow that updates stats automatically
- **Matchday Setup** — pick the squad pool, starters, and bench. Publish for the team
- **Skills Combine** — 5 mini-games (accuracy, reaction, speed, memory, decision) with club leaderboard
- **Settings** — change name, colors, league, squad size (5/7/9/11), delete club

Every club lives at its own URL: `/c/your-club-slug`. Public read access, admin-only writes.

---

## Architecture

- **Auth**: Firebase Auth (email/password). Each user can own or admin multiple clubs.
- **Data**: Firestore with all per-club data scoped under `clubs/{clubId}/*`.
- **Theming**: CSS custom properties injected from the club's config at runtime.
- **Routing**: `react-router-dom` — `/` landing, `/login`, `/signup`, `/app` dashboard, `/new` onboarding, `/c/:slug/*` club routes.

Firestore shape:

```
users/{uid}                         → { email, displayName, clubs: [slug…] }
clubs/{slug}                        → { name, slug, colors, crestUrl, ownerUid, admins, squadSize, league, tagline }
clubs/{slug}/players/{playerId}     → { name, position, number, photoUrl }
clubs/{slug}/fixtures/{id}          → { opponent, date, time, venue, home }
clubs/{slug}/results/{id}           → { opponent, date, ourScore, theirScore, players, motm, summary }
clubs/{slug}/stats/{playerName}     → { apps, goals, assists, yellows, reds, cleanSheets, motm }
clubs/{slug}/allTimeStats/{pname}   → (same shape, career totals)
clubs/{slug}/playerForm/{pname}     → { games: [{ rating, opp, date }…] }
clubs/{slug}/awards/{awardId}       → { name, icon, color, hint, winner }
clubs/{slug}/league/table           → { rows: [{ team, p, w, d, l, gf, ga, pts }…] }
clubs/{slug}/predictor/current      → { active, opp, date, predictions[], result }
clubs/{slug}/predictor/leaderboard  → { entries: [{ player, pts, games }…] }
clubs/{slug}/matchday/squad         → { squadPlayers, starters, bench, oppName, published }
clubs/{slug}/combineRuns/{runId}    → { name, scores, ovr, tierLabel }
```

---

## Running locally

```sh
npm install
npm run dev
```

You'll need a Firebase project with **Authentication (Email/Password)** and **Firestore** enabled. Update `src/firebase.js` with your config.

## Deploying

```sh
npm run build
firebase deploy
```

Deploys the static site to Firebase Hosting and the `firestore.rules` to your project.

---

## Roles

| Feature                                 | Public viewer | Authenticated player | Club admin | Club owner |
| --------------------------------------- | :-----------: | :------------------: | :--------: | :--------: |
| View home, squad, stats, table, results | ✅             | ✅                    | ✅          | ✅          |
| Submit a score prediction               | ✅ (via form)  | ✅                    | ✅          | ✅          |
| Submit a combine run                    | ✅             | ✅                    | ✅          | ✅          |
| Add players, fixtures, results          | ❌             | ❌                    | ✅          | ✅          |
| Edit stats, awards, league table        | ❌             | ❌                    | ✅          | ✅          |
| Publish matchday squad, run predictor   | ❌             | ❌                    | ✅          | ✅          |
| Change branding, squad size, delete     | ❌             | ❌                    | admin / owner only | ✅ |

---

Powered by the foundation originally built for Section FC.
