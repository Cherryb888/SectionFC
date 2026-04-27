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
const db = getFirestore(app);

const date        = "Mon 20 Apr 2026";
const opponent    = "High Prestbury FC";
const sfcScore    = 12;
const oppScore    = 0;
const publishedAt = new Date("2026-04-20T20:00:00").getTime();

const players = [
  { name: "Hayden Hunter",  pos: "ATT", played: true, goals: 3, assists: 3, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "9.5" },
  { name: "Guy Horton",     pos: "DEF", played: true, goals: 0, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "8.5" },
  { name: "Dani Griffiths", pos: "ATT", played: true, goals: 1, assists: 2, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "9"   },
  { name: "Ben Higgs",      pos: "ATT", played: true, goals: 1, assists: 3, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "9.5" },
  { name: "Rohan Naal",     pos: "DEF", played: true, goals: 1, assists: 1, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "9"   },
  { name: "George Mcnulty", pos: "ATT", played: true, goals: 5, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: true,  rating: "9.5" },
  { name: "Josh Treharne",  pos: "DEF", played: true, goals: 1, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: false, rating: "9"   },
  { name: "Jeven Dhillon",  pos: "GK",  played: true, goals: 0, assists: 3, yellows: 0, reds: 0, cleanSheet: true,  motm: false, rating: "9.5" },
];

const reportText = "Big clean sheet to wrap things up — George ran riot with 5, Hayd chipped in with a hat-trick and 3 assists, and Jeve kept the back door bolted with the gloves on. One game left.";

async function seed() {
  // Idempotency: presence in team/form is the canonical "already applied" marker.
  // (Avoids double-incrementing player stats if this script — or the admin UI — has run before.)
  const teamFormSnap = await getDoc(doc(db, "team", "form"));
  const existingResults = teamFormSnap.exists() ? (teamFormSnap.data().results || []) : [];
  const alreadyApplied = existingResults.some(r => r.opp === opponent && r.date === date);

  if (alreadyApplied) {
    console.log("⚠ team/form already has this result — skipping stat/form increments, refreshing report doc only.");
  } else {
    // 1. Increment per-player stats and append rating to playerForm (last 5)
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
      console.log(`✓ stats for ${p.name}`);
    }

    // 2. Append result to team/form (keep last 10)
    const newResults = [...existingResults, { sfcScore, oppScore, opp: opponent, date }].slice(-10);
    await setDoc(doc(db, "team", "form"), { results: newResults });
    console.log("✓ team/form updated");
  }

  // 3. Set matchday/report (always — idempotent overwrite)
  const report = {
    applied: true, sfcScore, oppScore, opponent, date,
    players, reportText, publishedAt,
  };
  await setDoc(doc(db, "matchday", "report"), report);
  console.log("✓ matchday/report set");

  // 4. Save to reportArchive
  await setDoc(doc(db, "reportArchive", `report_${publishedAt}`), report);
  console.log("✓ reportArchive entry created");

  console.log("\nDone!");
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
