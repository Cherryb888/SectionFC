import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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

const date      = "Mon 13 Apr 2026";
const opponent  = "Kariustoglory";
const sfcScore  = 5;
const oppScore  = 0;
const publishedAt = new Date("2026-04-13T20:00:00").getTime();

async function seed() {
  // 1. Update team/form (append result, keep last 10)
  const formSnap = await getDoc(doc(db, "team", "form"));
  const existing = formSnap.exists() ? (formSnap.data().results || []) : [];
  const alreadyThere = existing.some(r => r.opp === opponent && r.date === date);
  if (!alreadyThere) {
    const newResults = [...existing, { sfcScore, oppScore, opp: opponent, date }].slice(-10);
    await setDoc(doc(db, "team", "form"), { results: newResults });
    console.log("✓ team/form updated");
  } else {
    console.log("⚠ team/form already has this result, skipping");
  }

  // 2. Set matchday/report as applied
  const report = {
    applied: true,
    sfcScore,
    oppScore,
    opponent,
    date,
    players: [],
    reportText: "Opposition running scared.",
    publishedAt,
  };
  await setDoc(doc(db, "matchday", "report"), report);
  console.log("✓ matchday/report set");

  // 3. Save to reportArchive
  await setDoc(doc(db, "reportArchive", `report_${publishedAt}`), report);
  console.log("✓ reportArchive entry created");

  console.log("\nDone!");
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
