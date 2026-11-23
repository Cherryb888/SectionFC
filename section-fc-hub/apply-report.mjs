// Applies one post-match report to Firestore, doing exactly what APPLY TO
// STATS on the Match Report page does: season and all-time stats, player
// form, team form, matchday/report and reportArchive.
//
// For reports that come in as a message rather than through the app. Put the
// games in MATCHES below, oldest first, and run it. It refuses if any of them
// is already in team/form, the same guard the app uses, so running it twice
// can't double anyone's stats.
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

// Oldest first: they go in in this order, so player form and team form
// read in date order. No matchday squad was posted for these two, so
// there's no squadId and no positions, except Jeven in goal on 16 Nov.
const MATCHES = [
  {
    date:        "Mon 9 Nov 2026",
    opponent:    "RBCC FC",
    sfcScore:    7,
    oppScore:    1,
    publishedAt: Date.UTC(2026, 10, 9, 21, 30),
    squadId:     null,
    // In the order the gaffa rated them. No Man of the Match named.
    players: [
      P("Chiz",           "", "9.5", { goals: 4 }),
      P("Tom Goldsby",    "", "9",   { goals: 1, assists: 2 }),
      P("Hayden Hunter",  "", "8.5", { assists: 2 }),
      P("George Mcnulty", "", "8.5", { goals: 1, assists: 1 }),
      P("Ben Higgs",      "", "8.5", { goals: 1 }),
      P("Jeven Dhillon",  "", "8.5", { assists: 1 }),
    ],
    reportText: [
      "Now that's more like it. One of our best performances in a long time.",
      "Chiz ran the show from the start, helping himself to a first-half hat-trick and adding a fourth for good measure. Every time the ball came near him in the box, it ended up in the net.",
      "The football was a joy to watch. Some lovely one-twos carved RBCC open again and again. Golds, Higgs and Mcnults got themselves on the scoresheet too to round off a brilliant team display.",
      "At the back we defended well for the most part, and were only a whisker away from a clean sheet. If we're being picky, we were a touch open at times and a sharper attacking side might have tested us more, but that's a minor note on a day when almost everything clicked.",
      "A statement win and a performance to build on.",
    ].join("\n\n"),
  },
  {
    date:        "Mon 16 Nov 2026",
    opponent:    "Karachi Athletic FC",
    sfcScore:    10,
    oppScore:    3,
    publishedAt: Date.UTC(2026, 10, 16, 21, 30),
    squadId:     null,
    // Jeven's star is Man of the Match, in goal.
    players: [
      P("Jeven Dhillon",  "GK", "9.5", { motm: true }),
      P("Chiz",           "",   "9",   { goals: 2, assists: 3 }),
      P("Hayden Hunter",  "",   "9",   { goals: 1, assists: 3 }),
      P("George Mcnulty", "",   "9",   { goals: 2 }),
      P("Ben Higgs",      "",   "9",   { goals: 3, assists: 2 }),
      P("Tom Goldsby",    "",   "9",   { goals: 2 }),
    ],
    reportText: [
      "Ten goals and a man of the match between the sticks. Not a bad day at the office.",
      "This was a proper team performance from front to back. Higgs walked away with a hat-trick, Chiz, Mcnults and Goldsby bagged a brace each. The creativity was just as impressive, with Chiz and Hayden pulling the strings for three assists apiece and the ball moving quickly and cleanly all game.",
      "But the headline belongs to Jeve. In goal today, he pulled off a string of brilliant saves to keep them at bay whenever they did get a sight of goal, and fully earned his man of the match.",
      "We defended well, carried more threat going forward, and never really looked troubled. Great team performance, simple as that.",
    ].join("\n\n"),
  },
];

// Every game is checked before anything is written, so a run either puts
// all of them in or none.
let teamForm = (await getDoc(doc(db, "team", "form"))).data()?.results || [];
const already = MATCHES.filter(m => teamForm.some(r => r.opp === m.opponent && r.date === m.date));
if (already.length) {
  for (const m of already) console.error(`${m.opponent} on ${m.date} is already in team/form.`);
  console.error("Nothing written.");
  process.exit(1);
}

for (const m of MATCHES) {
  const goals = m.players.reduce((n, p) => n + p.goals, 0);
  if (goals > m.sfcScore) { console.error(`${m.date}: ${goals} scorers for ${m.sfcScore} goals. Nothing written.`); process.exit(1); }
  console.log(`\n${m.date} v ${m.opponent}: ${m.sfcScore}-${m.oppScore}`);
  for (const p of m.players) {
    console.log(`  ${p.name.padEnd(15)} ${p.rating.padEnd(4)} goals ${p.goals}  assists ${p.assists}${p.motm ? "  MOTM" : ""}`);
  }
  console.log(`  REPORT: reportArchive/report_${m.publishedAt}`);
}
console.log(`\nmatchday/report will be ${MATCHES.at(-1).date} v ${MATCHES.at(-1).opponent}.`);
if (!APPLY) { console.log("\nDRY RUN — nothing written. Re-run with --apply."); process.exit(0); }

for (const MATCH of MATCHES) {
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
  const final = { ...MATCH, applied: true };
  await setDoc(doc(db, "matchday", "report"), final);
  teamForm = [...teamForm, { sfcScore: MATCH.sfcScore, oppScore: MATCH.oppScore, opp: MATCH.opponent, date: MATCH.date }].slice(-10);
  await setDoc(doc(db, "team", "form"), { results: teamForm });
  await setDoc(doc(db, "reportArchive", `report_${MATCH.publishedAt}`), final);
  console.log(`✓ ${MATCH.date} v ${MATCH.opponent}: stats, allTimeStats, playerForm (${MATCH.players.length}), team/form, reportArchive`);
}
console.log("✓ matchday/report");
process.exit(0);
