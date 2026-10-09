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
  date:        "Mon 5 Oct 2026",
  opponent:    "RBCC FC",
  sfcScore:    4,
  oppScore:    4,
  publishedAt: Date.UTC(2026, 9, 5, 20, 0),
  squadId:     1791141525777,  // the matchday squad posted for this game
  // In the order the gaffa rated them. No MOTM was named. Positions are the
  // posted squad's; Chiz wasn't in it, so his is blank.
  players: [
    P("Ben Higgs",      "DEF", "8.5", { goals: 1, assists: 1 }),
    P("Mooney",         "SUB", "8.5", { goals: 1, assists: 1 }),
    P("Tom Goldsby",    "ATT", "8",   { goals: 1 }),
    P("Chiz",           "",    "8",   { goals: 1 }),
    P("Mo",             "DEF", "7.5"),
    P("Jeven Dhillon",  "GK",  "7.5"),
    P("Hayden Hunter",  "ATT", "7.5"),
    P("George Mcnulty", "SUB", "7.5"),
  ],
  reportText: [
    "Déjà vu. Another 4-0 lead, another four-all draw. At this point we might just be doing it for the drama.",
    "The first half was a joy to watch. Golds opened the scoring early, as is becoming tradition, and from there we were flying. Chiz marked his return with a goal, Higgs got on the scoresheet with a lovely half way chip and set one up, and Moon chipped in with a goal and an assist of his own. Four up at the break and everyone looking sharp.",
    "The second half was a different story. The opposition found their way back into it, and once the first one went in the momentum swung their way. We kept going, but four goals later we were shaking hands on a draw that felt more like a loss.",
    "If there's one thing to take from it, it's the shape when we've got the ball. With everyone pushing up at once, the man in possession was often left with nobody short to pass to, which meant forcing it forward and giving the ball away more than we'd like. A couple of players dropping in to offer an easy option could make all the difference next time. If we don't force it and keep the ball for longer maybe we'd give less opportunities for them to attack when we've got such a large lead.",
    "Only positive is we are still unbeaten and on for doing the invincibles.",
    "Onto the next 🫡",
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
