// Applies the two post-match reports we have player data for:
//   Mon 31 Aug 2026 — SECTION FC 6-4 Drew Peacock FC
//   Mon  7 Sep 2026 — SECTION FC 6-7 Karachi Athletic FC
// The Mon 24 Aug win over WSOPC FC (6-2) is in the league data only —
// no player stats were recorded for it.
//
// Run with: node seed-gw18-gw19.mjs
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

// Ordered oldest → newest so playerForm keeps the ratings in sequence.
const MATCHES = [
  {
    date:        "Mon 31 Aug 2026",
    opponent:    "Drew Peacock FC",
    sfcScore:    6,
    oppScore:    4,
    publishedAt: new Date("2026-08-31T20:00:00").getTime(),
    players: [
      { name: "Guy Horton",     pos: "GK",  played: true, goals: 0, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "8.5" },
      { name: "Tom Goldsby",    pos: "DEF", played: true, goals: 0, assists: 1, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "9.5" },
      { name: "Mooney",         pos: "ATT", played: true, goals: 3, assists: 2, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "9.5" },
      { name: "George Mcnulty", pos: "ATT", played: true, goals: 2, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "9.5" },
      { name: "Rohan Naal",     pos: "DEF", played: true, goals: 0, assists: 1, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "9.5" },
      { name: "Josh Treharne",  pos: "DEF", played: true, goals: 1, assists: 1, yellows: 0, reds: 0, cleanSheet: false, motm: true,  rating: "9.5" },
    ],
    reportText: "The hardest, most savage and diabolically skilful performance we've put in as a club. However, the job's not done yet. 3 games to go, 5 point gap to Karachi Athletic FC — and we play them next week. Gotta keep fighting for these results boys, let's keep it going.",
  },
  {
    date:        "Mon 7 Sep 2026",
    opponent:    "Karachi Athletic FC",
    sfcScore:    6,
    oppScore:    7,
    publishedAt: new Date("2026-09-07T20:00:00").getTime(),
    players: [
      { name: "Guy Horton",     pos: "DEF", played: true, goals: 0, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "6" },
      { name: "Jeven Dhillon",  pos: "GK",  played: true, goals: 0, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "6" },
      { name: "Tom Goldsby",    pos: "DEF", played: true, goals: 1, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "6" },
      { name: "Mooney",         pos: "ATT", played: true, goals: 2, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "6" },
      { name: "George Mcnulty", pos: "ATT", played: true, goals: 0, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: true,  rating: "6" },
      { name: "Akiat",          pos: "DEF", played: true, goals: 0, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "6" },
      { name: "Chiz",           pos: "ATT", played: true, goals: 1, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "6" },
      { name: "Hayden Hunter",  pos: "ATT", played: true, goals: 2, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "6" },
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
    console.log(`⚠ ${date} vs ${opponent} already in team/form — skipping increments, refreshing archive only.`);
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
