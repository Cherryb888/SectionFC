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
// read in date order. No matchday squad was posted for these three, so
// there's no squadId and no positions, except Jeven in goal on 2 Nov.
const MATCHES = [
  {
    date:        "Mon 19 Oct 2026",
    opponent:    "Youre getting 5%",
    sfcScore:    2,
    oppScore:    3,
    publishedAt: Date.UTC(2026, 9, 19, 21, 0),
    squadId:     null,
    // In the order the gaffa rated them. Mcnulty's star is Man of the Match.
    // Moon's last game before he goes out on loan.
    players: [
      P("Mooney",         "", "8.5", { goals: 1, assists: 1 }),
      P("George Mcnulty", "", "8",   { goals: 1, motm: true }),
      P("Jeven Dhillon",  "", "8",   { assists: 1 }),
      P("Chiz",           "", "7.5"),
      P("Hayden Hunter",  "", "7.5"),
      P("Josh Allenby",   "", "7.5"),
      P("Guy Horton",     "", "7.5"),
    ],
    reportText: [
      "A frustrating one, because we deserved more than we got.",
      "It started perfectly. Mcnults put us in front, and from there we defended in true \"haram\" style, compact, disciplined and making life difficult for them. Lovely stuff to watch.",
      "You're Getting 5% did show a bit of quality, though, and a well-worked goal brought them level just before half time. After the break they found another couple to go 3-1 up, and it looked like the game might be getting away from us.",
      "Then Moon stepped up. On his last game before heading off on loan 😢, he let fly from distance and found the net with a cracking long shot. A fitting send-off, and a big loss for the squad while he's away. Gracias for everything, Moon 😢",
      "We pushed hard for the equaliser but just couldn't quite get it over the line. The point would have been fully deserved, but there's plenty to be positive about from that performance.",
      "Well done lads. Unlucky one.",
    ].join("\n\n"),
  },
  {
    date:        "Mon 26 Oct 2026",
    opponent:    "Booty & Boys",
    sfcScore:    4,
    oppScore:    6,
    publishedAt: Date.UTC(2026, 9, 26, 21, 0),
    squadId:     null,
    // All six on an 8. Hayden's star is Man of the Match.
    players: [
      P("Hayden Hunter",  "", "8", { goals: 1, assists: 1, motm: true }),
      P("Tom Goldsby",    "", "8", { goals: 1, assists: 1 }),
      P("Ben Higgs",      "", "8", { goals: 1 }),
      P("George Mcnulty", "", "8", { goals: 1 }),
      P("Jeven Dhillon",  "", "8", { assists: 1 }),
      P("Guy Horton",     "", "8"),
    ],
    reportText: [
      "A tough afternoon against the unbeaten league leaders, but plenty to be proud of.",
      "It started brilliantly. Higgs put us 1-0 up with a lovely finish from a tight angle, and for a moment it looked like we might cause an upset. Booty and Boys had other ideas, though, rattling in three on the bounce. They kept finding a soft pass through the middle and we just couldn't clear our lines. Hayden and Golds got us back in it before the break, Hayden teeing up Golds to make it 3-2.",
      "The second half followed a similar pattern. They hit another flurry, but we kept answering. Mcnulty curled a beauty from distance into the bottom corner, and then came the moment of the match: a flowing team move where everyone got a touch, finished off by Hayden.",
      "Overall, 6-4 felt like a fair result. With a sub or two more we might have had the legs to push them closer, and it wasn't a bad performance at all against the best side in the league. If there's one thing to work on, it's tracking our man a bit more closely, but they were superb in tight spaces so it's nothing to lose sleep over.",
    ].join("\n\n"),
  },
  {
    date:        "Mon 2 Nov 2026",
    opponent:    "Drew Peacock FC",
    sfcScore:    4,
    oppScore:    2,
    publishedAt: Date.UTC(2026, 10, 2, 21, 0),
    squadId:     null,
    // Jeven's star is Man of the Match. Max H's first game for us.
    players: [
      P("Jeven Dhillon",  "GK", "9.5", { motm: true }),
      P("Guy Horton",     "",   "9",   { goals: 1 }),
      P("Ben Higgs",      "",   "9",   { goals: 1, assists: 1 }),
      P("Tom Goldsby",    "",   "9",   { goals: 1, assists: 1 }),
      P("George Mcnulty", "",   "9"),
      P("Max H",          "",   "9"),
      P("Mo",             "",   "9",   { goals: 1, assists: 1 }),
    ],
    reportText: [
      "Drew Peacock FC arrived with the best name in the league, and it turned out to be the best thing about them. By full time, Section had well and truly plucked their feathers.",
      "Mo opened the scoring, finishing a slick team move teed up by Goldsby. Goldsby then decided that assists were all well and good but he'd quite like one for himself, tucking away another fine team goal after Higgs laid it on a plate.",
      "The moment of the night belonged to Guy. Mo sent him down the line, the angle was tight, the sensible option was a cross, and Guy is never one for the sensible option. He smashed in an absolute screamer to break his duck. Reports that he's still celebrating are unconfirmed.",
      "Higgs topped it off with a fine finish to complete a tidy night's work. Drew Peacock nicked two of their own, but it could have been plenty more if not for Jeven, who pulled off some fine saves to take a thoroughly deserved Man of the Match. Up Section. 🟡⚫",
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
