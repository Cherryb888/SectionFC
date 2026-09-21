// One-off correction: the Division 1 season was played by Josh Allenby, not
// Josh Treharne. Treharne's record is the Division 2 games plus a single
// Div 1 appearance with no returns; every goal, assist and MOTM in Div 1
// belongs to Allenby.
//
// Rather than hand-patch totals, this renames the player in the affected
// match reports and then recomputes both players' stats, all-time stats and
// form from reportArchive, which is the source of truth for who played.
//
// Run with: node fix-josh.mjs [--apply]     (no flag = dry run)
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, getDocs, setDoc } from 'firebase/firestore';

const APPLY = process.argv.includes('--apply');

const app = initializeApp({ apiKey:"AIzaSyDcUgW63U0Ii5DKkPEn5AjhrIi0LYNgDkA", authDomain:"section-fc.firebaseapp.com", projectId:"section-fc", storageBucket:"section-fc.firebasestorage.app", messagingSenderId:"849649943584", appId:"1:849649943584:web:f407e9c2bdcfd7c7d26845" });
const db = getFirestore(app);

// Pre-promotion Division 2 games. Everything after these is the Div 1 season,
// which is also where the season stats reset to zero.
const DIV2 = ["Mon 13 Apr 2026", "Mon 20 Apr 2026", "Mon, 27 Apr 2026"];
// The one Div 1 game that stays Treharne's: no goals, no assists, no MOTM.
const TREHARNE_KEEPS = "Mon, 4 May 2026";

const snap = await getDocs(collection(db, "reportArchive"));
const reports = [];
snap.forEach(d => reports.push({ _id: d.id, ...d.data() }));
reports.sort((a, b) => (a.publishedAt || 0) - (b.publishedAt || 0));

// 1. Reassign. Any Treharne appearance in a Div 1 game other than the one he
//    keeps was actually Allenby.
const touched = [];
for (const r of reports) {
  if (DIV2.includes(r.date) || r.date === TREHARNE_KEEPS) continue;
  let changed = false;
  for (const p of (r.players || [])) {
    if (p.name === "Josh Treharne") { p.name = "Josh Allenby"; changed = true; }
  }
  if (changed) touched.push(r);
}
console.log("REASSIGNED TO JOSH ALLENBY:");
touched.forEach(r => console.log(`  ${r.date.padEnd(17)} ${r.sfcScore}-${r.oppScore} v ${r.opponent}`));

// 2. Recompute both players from the corrected archive.
const blank = () => ({ apps:0, goals:0, assists:0, yellows:0, reds:0, cleanSheets:0, motm:0 });
const totals = { season:{}, allTime:{}, form:{} };
for (const n of ["Josh Treharne", "Josh Allenby"]) {
  totals.season[n] = blank(); totals.allTime[n] = blank(); totals.form[n] = [];
}
for (const r of reports) {
  const isDiv1 = !DIV2.includes(r.date);
  for (const p of (r.players || [])) {
    if (!totals.allTime[p.name] || p.played === false) continue;
    const add = t => {
      t.apps++; t.goals += +p.goals || 0; t.assists += +p.assists || 0;
      t.yellows += +p.yellows || 0; t.reds += +p.reds || 0;
      t.cleanSheets += p.cleanSheet ? 1 : 0; t.motm += p.motm ? 1 : 0;
    };
    add(totals.allTime[p.name]);
    if (isDiv1) {
      add(totals.season[p.name]);
      const rating = parseFloat(p.rating);
      if (!isNaN(rating)) totals.form[p.name].push({ rating, opp: r.opponent, date: r.date });
    }
  }
}
console.log("\nRESULT:");
for (const n of ["Josh Treharne", "Josh Allenby"]) {
  const s = totals.season[n], a = totals.allTime[n];
  console.log(`  ${n}`);
  console.log(`    season   apps ${s.apps}  goals ${s.goals}  assists ${s.assists}  motm ${s.motm}`);
  console.log(`    all-time apps ${a.apps}  goals ${a.goals}  assists ${a.assists}  motm ${a.motm}`);
  console.log(`    form     ${totals.form[n].map(g => g.rating).join(", ") || "—"}`);
}

if (!APPLY) { console.log("\nDRY RUN — nothing written. Re-run with --apply."); process.exit(0); }

for (const r of touched) {
  const { _id, ...body } = r;
  await setDoc(doc(db, "reportArchive", _id), body);
  console.log(`  ✓ reportArchive/${_id}`);
}
for (const n of ["Josh Treharne", "Josh Allenby"]) {
  await setDoc(doc(db, "stats", n), totals.season[n]);
  await setDoc(doc(db, "allTimeStats", n), totals.allTime[n]);
  await setDoc(doc(db, "playerForm", n), { games: totals.form[n].slice(-5) });
  console.log(`  ✓ stats / allTimeStats / playerForm for ${n}`);
}
console.log("\nDone.");
process.exit(0);
