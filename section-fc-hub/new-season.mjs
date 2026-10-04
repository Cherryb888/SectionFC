// Rolls Firestore over from the 2026 season to Autumn 2026 and puts the opening
// night in: SECTION FC 6-6 Drew Peacock FC, Mon 28 Sep 2026.
//
// 1. Archives everything season-scoped to seasonArchive/2026: season stats,
//    all-time stats as they stood, player form, team form, the predictor and
//    its leaderboard, and the last report and squad. Nothing is lost, and the
//    rollover can be undone from there.
// 2. Starts the season again, the same as RESET SEASON STATS on the Squad
//    Stats page: season stats back to zero, player form, team form and the
//    predictor leaderboard cleared, the predictor closed, the 21 Sep squad
//    taken down. All-time stats, the report archive, the Hall of Fame and the
//    saved opposition squads are kept.
// 3. Applies the opening-night report: season and all-time stats, player
//    form, team form, matchday/report and reportArchive.
//
// Every write is an end state worked out from the archive rather than an
// increment, so running it twice leaves things exactly as running it once.
// The 2026 totals the app shows are frozen in src/seasons/2026.js.
//
// Run with: node new-season.mjs [--apply]     (no flag = dry run)
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

const APPLY = process.argv.includes('--apply');

const app = initializeApp({ apiKey:"AIzaSyDcUgW63U0Ii5DKkPEn5AjhrIi0LYNgDkA", authDomain:"section-fc.firebaseapp.com", projectId:"section-fc", storageBucket:"section-fc.firebasestorage.app", messagingSenderId:"849649943584", appId:"1:849649943584:web:f407e9c2bdcfd7c7d26845" });
const db = getFirestore(app);

const ARCHIVE_ID = "2026";
const STAT_KEYS  = ["apps","goals","assists","yellows","reds","cleanSheets","motm"];

const P = (name, pos, rating, extra = {}) => ({
  name, pos, played: true,
  goals: 0, assists: 0, yellows: 0, reds: 0, cleanSheet: false, motm: false,
  rating,
  ...extra,
});

const MATCH = {
  date:        "Mon 28 Sep 2026",
  opponent:    "Drew Peacock FC",
  sfcScore:    6,
  oppScore:    6,
  publishedAt: Date.UTC(2026, 8, 28, 20, 0),
  // In the order the gaffa rated them. No assists were given. Lee Trundle's
  // first game for us; the report didn't say where he played.
  players: [
    P("Mo",            "ATT", "9",   { goals: 3, motm: true }),
    P("Tom Goldsby",   "DEF", "8.5", { goals: 2 }),
    P("Jeven Dhillon", "GK",  "8",   { goals: 1 }),
    P("Hayden Hunter", "ATT", "8"),
    P("Guy Horton",    "DEF", "8"),
    P("Lee Trundle",   "",    "8"),
    P("Ben Higgs",     "ATT", "8"),
  ],
  reportText: [
    "Two points thrown away. There's no other way to put it.",
    "It all started so well. Golds got us off the mark inside the opening minutes, and for a while it looked like we'd be cruising to a big win. We went 4-0 up playing some of our best football of the season, and at that point nobody in the ground thought this one was in doubt.",
    "Then it fell apart. Drew Peacock clawed one back, then another, and suddenly the confidence drained out of us. Every time we pushed ahead again they had an answer. Mo did everything he could, completing his hat-trick and dragging us back in front more than once, and Golds added his second as the goals kept coming at both ends.",
    "Six goals scored is plenty. Six conceded from 4-0 up is a lesson we need to learn quickly.",
    "Going to have to watch ourselves from corners and check our tactics when we're winning comfortably. Need to set up shop.",
  ].join("\n\n"),
};

const readCol = async name => {
  const out = {};
  (await getDocs(collection(db, name))).forEach(d => { out[d.id] = d.data(); });
  return out;
};
const readDoc = async (c, id) => {
  const snap = await getDoc(doc(db, c, id));
  return snap.exists() ? snap.data() : null;
};
const zero = () => Object.fromEntries(STAT_KEYS.map(k => [k, 0]));
const add  = (a, b) => Object.fromEntries(STAT_KEYS.map(k => [k, (a?.[k] || 0) + (b?.[k] || 0)]));
const line = s => STAT_KEYS.map(k => `${k} ${s[k]}`).join("  ");

// ── 1. Archive ───────────────────────────────────────────────────────────────
let archive = await readDoc("seasonArchive", ARCHIVE_ID);
const archiveExists = !!archive;
if (archiveExists) {
  // Already rolled over. Re-running is only safe while the opening night is
  // the season's only game; after that it would wipe the games added since.
  const teamForm = (await readDoc("team", "form"))?.results || [];
  if (teamForm.some(r => !(r.opp === MATCH.opponent && r.date === MATCH.date))) {
    console.error("The season has moved on since the rollover. Nothing written.");
    process.exit(1);
  }
  console.log(`seasonArchive/${ARCHIVE_ID} already written ${new Date(archive.archivedAt).toISOString()}, using it as the baseline.`);
} else {
  // Without an archive the live data is the 2026 season. If the opening night
  // is already in it (added through the app), stop: the baseline would count
  // that game, and adding it again would double it.
  const teamForm = (await readDoc("team", "form"))?.results || [];
  if (teamForm.some(r => r.opp === MATCH.opponent && r.date === MATCH.date)) {
    console.error(`${MATCH.date} v ${MATCH.opponent} is already in team/form. Nothing written.`);
    process.exit(1);
  }
  archive = {
    season:               "2026",
    division:             "Division 1",
    archivedAt:           Date.now(),
    stats:                await readCol("stats"),
    allTimeStats:         await readCol("allTimeStats"),
    playerForm:           await readCol("playerForm"),
    teamForm,
    predictor:            await readDoc("predictor", "current"),
    predictorLeaderboard: (await readDoc("season", "leaderboard"))?.entries || [],
    matchdayReport:       await readDoc("matchday", "report"),
    matchdaySquad:        await readDoc("matchday", "squad"),
  };
  console.log(`seasonArchive/${ARCHIVE_ID} to be written: ${Object.keys(archive.stats).length} season stat records, ` +
              `${Object.keys(archive.allTimeStats).length} all-time, ${Object.keys(archive.playerForm).length} player form, ` +
              `${archive.teamForm.length} team form results, ${archive.predictorLeaderboard.length} predictor leaderboard entries.`);
}

// ── 2 + 3. End states ────────────────────────────────────────────────────────
const contrib = {};
for (const p of MATCH.players) {
  if (!p.played) continue;
  contrib[p.name] = {
    apps: 1, goals: p.goals, assists: p.assists, yellows: p.yellows, reds: p.reds,
    cleanSheets: p.cleanSheet ? 1 : 0, motm: p.motm ? 1 : 0,
  };
}

const seasonStats = {};
for (const name of new Set([...Object.keys(archive.stats), ...Object.keys(contrib)])) {
  seasonStats[name] = add(zero(), contrib[name]);
}
const allTime = {};
for (const name of Object.keys(contrib)) allTime[name] = add(archive.allTimeStats[name], contrib[name]);

const form = {};
for (const p of MATCH.players) {
  const r = parseFloat(p.rating);
  if (p.played && !isNaN(r)) form[p.name] = { games: [{ rating: r, opp: MATCH.opponent, date: MATCH.date }] };
}
const formNow   = await readCol("playerForm");
const formClear = Object.keys(formNow).filter(n => !form[n]);

const report = {
  applied:     true,
  sfcScore:    MATCH.sfcScore,
  oppScore:    MATCH.oppScore,
  opponent:    MATCH.opponent,
  date:        MATCH.date,
  players:     MATCH.players,
  reportText:  MATCH.reportText,
  publishedAt: MATCH.publishedAt,
};

console.log(`\nSEASON STATS: ${Object.keys(seasonStats).length} records, all back to zero except the opening night:`);
for (const name of Object.keys(contrib)) console.log(`  ${name.padEnd(15)} ${line(seasonStats[name])}`);
console.log("\nALL-TIME STATS:");
for (const name of Object.keys(contrib)) {
  console.log(`  ${name.padEnd(15)} apps ${archive.allTimeStats[name]?.apps || 0} -> ${allTime[name].apps}   goals ${archive.allTimeStats[name]?.goals || 0} -> ${allTime[name].goals}   motm ${archive.allTimeStats[name]?.motm || 0} -> ${allTime[name].motm}`);
}
console.log(`\nPLAYER FORM: ${Object.keys(form).length} set to the opening night, ${formClear.length} cleared (${formClear.join(", ") || "none"})`);
console.log(`TEAM FORM:   ${MATCH.sfcScore}-${MATCH.oppScore} v ${MATCH.opponent} only`);
console.log("PREDICTOR:   closed, leaderboard cleared   SQUAD: taken down");
console.log(`REPORT:      matchday/report and reportArchive/report_${MATCH.publishedAt}`);

if (!APPLY) { console.log("\nDRY RUN — nothing written. Re-run with --apply."); process.exit(0); }

// ── Write ────────────────────────────────────────────────────────────────────
if (!archiveExists) {
  await setDoc(doc(db, "seasonArchive", ARCHIVE_ID), archive);
  console.log(`\n✓ seasonArchive/${ARCHIVE_ID}`);
}
for (const [name, s] of Object.entries(seasonStats)) await setDoc(doc(db, "stats", name), s);
console.log(`✓ stats (${Object.keys(seasonStats).length})`);
for (const [name, s] of Object.entries(allTime)) await setDoc(doc(db, "allTimeStats", name), s);
console.log(`✓ allTimeStats (${Object.keys(allTime).length})`);
for (const name of formClear) await deleteDoc(doc(db, "playerForm", name));
for (const [name, f] of Object.entries(form)) await setDoc(doc(db, "playerForm", name), f);
console.log(`✓ playerForm (${Object.keys(form).length} set, ${formClear.length} cleared)`);
await setDoc(doc(db, "team", "form"), { results: [{ sfcScore: MATCH.sfcScore, oppScore: MATCH.oppScore, opp: MATCH.opponent, date: MATCH.date }] });
await setDoc(doc(db, "season", "leaderboard"), { entries: [] });
await setDoc(doc(db, "predictor", "current"), { active: false, opp: "", date: "", home: "", away: "", predictions: [], result: null, propPlayer: "", goalsLine: null, propResult: null });
await setDoc(doc(db, "matchday", "squad"), { published: false });
console.log("✓ team/form, season/leaderboard, predictor/current, matchday/squad");
await setDoc(doc(db, "matchday", "report"), report);
await setDoc(doc(db, "reportArchive", `report_${MATCH.publishedAt}`), report);
console.log("✓ matchday/report + reportArchive");
console.log("\nDone.");
process.exit(0);
