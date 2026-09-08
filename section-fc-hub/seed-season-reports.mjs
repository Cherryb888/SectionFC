// Backfills the match reports and player stats for the 2026 season games
// that were only ever posted in the WhatsApp group.
//
// Ordered oldest → newest so playerForm keeps the last-5 ratings in sequence
// and matchday/report ends on the most recent game.
//
// Not included:
//   Mon 13 Jul 2026 — Drew Peacock FC 4-1 SECTION FC (no player data)
//   Mon 24 Aug 2026 — SECTION FC 6-2 WSOPC FC        (no player data)
//   Mon 10 Aug 2026 — SECTION FC 5-0 RBCC FC         (walkover, RBCC didn't
//                     turn up — league result only, no apps or ratings)
//
// Run with: node seed-season-reports.mjs
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, increment } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDcUgW63U0Ii5DKkPEn5AjhrIi0LYNgDkA",
  authDomain: "section-fc.firebaseapp.com",
  projectId: "section-fc",
  storageBucket: "section-fc.firebasestorage.app",
  messagingSenderId: "849649943584",
  appId: "1:849649943584:web:f407e9c2bdcfd7c7d26845"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// Shorthand so the squad lists below stay readable.
const P = (name, pos, rating, extra = {}) => ({
  name, pos, played: true,
  goals: 0, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: false,
  rating,
  ...extra,
});

const MATCHES = [
  {
    date:        "Mon 6 Jul 2026",
    opponent:    "WSOPC FC",
    sfcScore:    2,
    oppScore:    3,
    publishedAt: new Date("2026-07-06T20:00:00").getTime(),
    // No ratings were posted for this one — apps and goals only.
    players: [
      P("Tom Beeston",   "DEF", ""),
      P("Ben Higgs",     "ATT", "", { goals: 1 }),
      P("Jeven Dhillon", "GK",  ""),
      P("Hayden Hunter", "ATT", "", { goals: 1 }),
      P("Tom Goldsby",   "DEF", ""),
    ],
    reportText: "Good effort today lads, some great play and positionally stayed very solid. Their keeper had a bit of a blinder but I think we can all agree that we could've scored a few more with better finishing. I think if we had subs we would've won that game — all in all a good shift from the lads, with the lack of sleep and the heat we all put in the effort.",
  },
  {
    date:        "Mon 20 Jul 2026",
    opponent:    "Karachi Athletic FC",
    sfcScore:    3,
    oppScore:    2,
    publishedAt: new Date("2026-07-20T20:00:00").getTime(),
    players: [
      P("Guy Horton",     "DEF", "9",   { goals: 1 }),
      P("George Mcnulty", "ATT", "9",   { goals: 1 }),
      P("Mo",             "ATT", "9.5", { goals: 1, assists: 2, motm: true }),
      P("Tom Goldsby",    "DEF", "9"),
      P("Ben Higgs",      "ATT", "9"),
      P("Hayden Hunter",  "ATT", "9",   { assists: 1 }),
      P("Jeven Dhillon",  "GK",  "9"),
      P("Mooney",         "ATT", "9"),
    ],
    reportText: "We are back.",
  },
  {
    date:        "Mon 27 Jul 2026",
    opponent:    "Youre getting 5%",
    sfcScore:    4,
    oppScore:    9,
    publishedAt: new Date("2026-07-27T20:30:00").getTime(),
    players: [
      P("Guy Horton",     "DEF", "7",   { assists: 1 }),
      P("George Mcnulty", "ATT", "8"),
      P("Josh Treharne",  "DEF", "9",   { goals: 2 }),
      P("Tom Goldsby",    "DEF", "8.5"),
      P("Mooney",         "ATT", "7",   { goals: 2 }),
      P("Rohan Naal",     "GK",  "8",   { assists: 1 }),
    ],
    reportText: "Beaten down but we've found a new keeper.",
  },
  {
    date:        "Mon 3 Aug 2026",
    opponent:    "Booty & Boys",
    sfcScore:    5,
    oppScore:    5,
    publishedAt: new Date("2026-08-03T18:30:00").getTime(),
    players: [
      P("Jeven Dhillon",  "GK",  ""),
      P("George Mcnulty", "ATT", "8"),
      P("Josh Treharne",  "DEF", "9",   { goals: 1 }),
      P("Tom Goldsby",    "DEF", "8.5"),
      P("Mooney",         "ATT", "7",   { goals: 2 }),
      P("Ben Higgs",      "ATT", "",    { goals: 1 }),
      P("Freddie Palmer", "ATT", "",    { goals: 1 }),
    ],
    reportText: "Sometimes there's nothing a manager can do but witness the events of a game. Lovely football, just shy of the win. Keep playing like this and we will avoid relegation easy 👏",
  },
  {
    date:        "Mon 17 Aug 2026",
    opponent:    "Pigs",
    sfcScore:    1,
    oppScore:    4,
    publishedAt: new Date("2026-08-17T19:10:00").getTime(),
    players: [
      P("Mooney",         "ATT", "9",   { goals: 1 }),
      P("Guy Horton",     "DEF", "8.5", { assists: 1 }),
      P("George Mcnulty", "ATT", "8.5"),
      P("Hayden Hunter",  "ATT", "8"),
      P("Josh Treharne",  "DEF", "8.5"),
      P("Jeven Dhillon",  "GK",  "8.5"),
      P("Ben Higgs",      "ATT", "9",   { motm: true }),
    ],
    reportText: "How do you play football? Because you play, or for something inside? In your lives, whatever you are going to do, do it with passion. I don't want good players, I want players with passion. Need to win the rest of the games this season lads.",
  },
  {
    date:        "Mon 31 Aug 2026",
    opponent:    "Drew Peacock FC",
    sfcScore:    6,
    oppScore:    4,
    publishedAt: new Date("2026-08-31T19:50:00").getTime(),
    players: [
      P("Guy Horton",     "GK",  "8.5"),
      P("Tom Goldsby",    "DEF", "9.5", { assists: 1 }),
      P("Mooney",         "ATT", "9.5", { goals: 3, assists: 2 }),
      P("George Mcnulty", "ATT", "9.5", { goals: 2 }),
      P("Rohan Naal",     "DEF", "9.5", { assists: 1 }),
      P("Josh Treharne",  "DEF", "9.5", { goals: 1, assists: 1, motm: true }),
    ],
    reportText: "The hardest, most savage and diabolically skilful performance we've put in as a club. However, the job's not done yet. 3 games to go, 5 point gap to Karachi Athletic FC — and we play them next week. Gotta keep fighting for these results boys, let's keep it going.",
  },
  {
    date:        "Mon 7 Sep 2026",
    opponent:    "Karachi Athletic FC",
    sfcScore:    6,
    oppScore:    6,
    publishedAt: new Date("2026-09-07T18:30:00").getTime(),
    players: [
      P("Guy Horton",     "DEF", "6"),
      P("Jeven Dhillon",  "GK",  "6"),
      P("Tom Goldsby",    "DEF", "6", { goals: 1 }),
      P("Mooney",         "ATT", "6", { goals: 2 }),
      P("George Mcnulty", "ATT", "6", { motm: true }),
      P("Akiat",          "DEF", "6"),
      P("Chiz",           "ATT", "6", { goals: 1 }),
      P("Hayden Hunter",  "ATT", "6", { goals: 2 }),
    ],
    reportText: "Emergency board meeting called after the game — gaffa's contract being investigated. We were so close to the win, after putting in some brilliant work, we failed in our last efforts. All we can do is win our last two games and hope Karachi slip on the soap so we can stay in DIV 1.",
  },
];

async function applyMatch(m) {
  const { date, opponent, sfcScore, oppScore, publishedAt, players, reportText } = m;

  // Idempotency: presence in team/form is the canonical "already applied" marker.
  const teamFormSnap = await getDoc(doc(db, "team", "form"));
  const existingResults = teamFormSnap.exists() ? (teamFormSnap.data().results || []) : [];
  const alreadyApplied = existingResults.some(r => r.opp === opponent && r.date === date);

  if (alreadyApplied) {
    console.log(`  ⚠ already in team/form — skipping increments, refreshing archive only.`);
  } else {
    for (const p of players) {
      if (!p.played) continue;
      const upd = {
        apps:        increment(1),
        goals:       increment(parseInt(p.goals)   || 0),
        assists:     increment(parseInt(p.assists) || 0),
        yellows:     increment(parseInt(p.yellows) || 0),
        reds:        increment(parseInt(p.reds)    || 0),
        cleanSheets: increment(p.cleanSheet ? 1 : 0),
        motm:        increment(p.motm       ? 1 : 0),
      };
      await setDoc(doc(db, "stats",        p.name), upd, { merge: true });
      await setDoc(doc(db, "allTimeStats", p.name), upd, { merge: true });

      const r = parseFloat(p.rating);
      if (!isNaN(r)) {
        const formSnap = await getDoc(doc(db, "playerForm", p.name));
        const existing = formSnap.exists() ? (formSnap.data().games || []) : [];
        const newGames = [...existing, { rating: r, opp: opponent, date }].slice(-5);
        await setDoc(doc(db, "playerForm", p.name), { games: newGames });
      }
      console.log(`  ✓ stats for ${p.name}`);
    }

    const newResults = [...existingResults, { sfcScore, oppScore, opp: opponent, date }].slice(-10);
    await setDoc(doc(db, "team", "form"), { results: newResults });
    console.log("  ✓ team/form updated");
  }

  const report = { applied: true, sfcScore, oppScore, opponent, date, players, reportText, publishedAt };
  await setDoc(doc(db, "matchday", "report"), report);
  await setDoc(doc(db, "reportArchive", `report_${publishedAt}`), report);
  console.log("  ✓ matchday/report + reportArchive set");
}

async function seed() {
  for (const m of MATCHES) {
    console.log(`\n── ${m.date}: SECTION FC ${m.sfcScore}-${m.oppScore} ${m.opponent}`);
    await applyMatch(m);
  }
  console.log("\nDone!");
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
