// Applies one post-match report to Firestore, doing exactly what APPLY TO
// STATS on the Match Report page does: season and all-time stats, player
// form, team form, matchday/report and reportArchive.
//
// For reports that come in as a message rather than through the app. Put the
// game in MATCH below and run it. It refuses a game that's already in
// team/form, the same guard the app uses, so running it twice can't double
// anyone's stats.
//
// Run with: node apply-report.mjs [--apply]     (no flag = dry run)
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, increment } from 'firebase/firestore';

const APPLY = process.argv.includes('--apply');

const app = initializeApp({ apiKey:"AIzaSyDcUgW63U0Ii5DKkPEn5AjhrIi0LYNgDkA", authDomain:"section-fc.firebaseapp.com", projectId:"section-fc", storageBucket:"section-fc.firebasestorage.app", messagingSenderId:"849649943584", appId:"1:849649943584:web:f407e9c2bdcfd7c7d26845" });
const db = getFirestore(app);

const P = (name, pos, rating, extra = {}) => ({
  name, pos, played: true,
  goals: 0, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: false,
  rating,
  ...extra,
});

const MATCH = {
  date:        "Mon 12 Oct 2026",
  opponent:    "Karachi Athletic FC",
  sfcScore:    5,
  oppScore:    4,
  publishedAt: Date.UTC(2026, 9, 12, 21, 0),
  squadId:     1791753334828,  // the matchday squad posted for this game
  // In the order the gaffa rated them. Chiz's star is Man of the Match.
  // Positions are the posted squad's; Chiz, Josh and Mooney were on the bench.
  players: [
    P("Chiz",           "SUB", "9.5", { goals: 3, motm: true }),
    P("Hayden Hunter",  "ATT", "8.5", { goals: 1, assists: 1 }),
    P("Mooney",         "SUB", "8.5", { assists: 2 }),
    P("Josh Allenby",   "SUB", "8.5", { goals: 1 }),
    P("Tom Goldsby",    "ATT", "8",   { assists: 1 }),
    P("Ben Higgs",      "DEF", "8",   { assists: 1 }),
    P("Guy Horton",     "DEF", "8"),
    P("Jeven Dhillon",  "GK",  "8"),
  ],
  reportText: [
    "Chiz set the tone today. A hat-trick to open the game, and we needed every one of them as we traded blows with Karachi in a proper back-and-forth contest. There were some lovely moves in there too, with the ball zipping between Golds, Higgs and Moon to carve out chances, and Josh slotting one home with a calm finish. Hayden got in on the act as well with a goal and an assist.",
    "We played well overall, but a few sloppy goals conceded kept Karachi in it. Too often we left them a spare man rather than staying solid, and they made us pay. When we stayed narrow we looked much safer at the back, so the lesson is simple: stay switched on, pick up a man, and don't leave a free body running onto the ball.",
    "In the end, though, we saw it out in style, \"haram balling\" our way through the last few minutes to get the job done. A great game and a great result.",
  ].join("\n\n"),
};

const teamForm = (await getDoc(doc(db, "team", "form"))).data()?.results || [];
if (teamForm.some(r => r.opp === MATCH.opponent && r.date === MATCH.date)) {
  console.error(`${MATCH.opponent} on ${MATCH.date} is already in team/form. Nothing written.`);
  process.exit(1);
}

for (const p of MATCH.players) {
  console.log(`  ${p.name.padEnd(15)} ${p.rating.padEnd(4)} goals ${p.goals}  assists ${p.assists}${p.motm ? "  MOTM" : ""}`);
}
console.log(`TEAM FORM: + ${MATCH.sfcScore}-${MATCH.oppScore} v ${MATCH.opponent}, ${MATCH.date}`);
console.log(`REPORT:    matchday/report and reportArchive/report_${MATCH.publishedAt}`);
if (!APPLY) { console.log("\nDRY RUN — nothing written. Re-run with --apply."); process.exit(0); }

for (const p of MATCH.players) {
  if (!p.played) continue;
  const upd = {
    apps:        increment(1),
    goals:       increment(p.goals),
    assists:     increment(p.assists),
    yellows:     increment(p.yellows),
    reds:        increment(p.reds),
    cleanSheets: increment(p.cleanSheet ? 1 : 0),
    motm:        increment(p.motm ? 1 : 0),
  };
  await setDoc(doc(db, "stats",        p.name), upd, { merge: true });
  await setDoc(doc(db, "allTimeStats", p.name), upd, { merge: true });
  const r = parseFloat(p.rating);
  if (!isNaN(r)) {
    const games = (await getDoc(doc(db, "playerForm", p.name))).data()?.games || [];
    await setDoc(doc(db, "playerForm", p.name), { games: [...games, { rating: r, opp: MATCH.opponent, date: MATCH.date }].slice(-5) });
  }
}
console.log(`✓ stats, allTimeStats, playerForm (${MATCH.players.length})`);

const final = { ...MATCH, applied: true };
await setDoc(doc(db, "matchday", "report"), final);
await setDoc(doc(db, "team", "form"), { results: [...teamForm, { sfcScore: MATCH.sfcScore, oppScore: MATCH.oppScore, opp: MATCH.opponent, date: MATCH.date }].slice(-10) });
await setDoc(doc(db, "reportArchive", `report_${MATCH.publishedAt}`), final);
console.log("✓ team/form, matchday/report, reportArchive");
process.exit(0);
