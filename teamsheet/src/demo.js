// ── Demo team ────────────────────────────────────────────────────────────────
// A made-up 7-a-side side half way through a season, so visitors can see
// every screen with something on it before setting up their own.

import { DEMO_ID, putLocalTeam } from "./store";

const P = (id, name, number, pos, role) => ({ id, name, number: String(number), pos, photo: null, ...(role && { role }) });
const players = [
  P("p1", "Jordan Hale", 1, "GK"),
  P("p2", "Marcus Bell", 2, "DEF", "Captain"),
  P("p3", "Tom Ashworth", 5, "DEF"),
  P("p4", "Kofi Mensah", 4, "DEF"),
  P("p5", "Luca Reid", 8, "MID"),
  P("p6", "Priya Patel", 10, "MID"),
  P("p7", "Danny Shaw", 6, "MID"),
  P("p8", "Sam Okafor", 9, "ATT"),
  P("p9", "Ellis Grant", 11, "ATT"),
  P("p10", "Ryan Doyle", 7, "ATT"),
  P("p11", "Chris Nolan", 13, "GK"),
  P("p12", "Femi Adeyemi", 3, "DEF", "Manager"),
];

const day = n => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const R = (id, daysAgo, opponent, gf, ga, played, events, motm, extra = {}) => ({
  id, status: "result", date: day(-daysAgo), time: "19:30", opponent, venue: "Goals Manchester, Pitch 4",
  home: daysAgo % 14 === 0, gf, ga, played, events, motm, keeper: played.includes("p1") ? "p1" : "p11", ...extra,
});

const XI = ["p1", "p2", "p3", "p5", "p6", "p8", "p9", "p10", "p7"];

const matches = [
  R("m1", 42, "Athletico Spanner", 4, 2, XI,
    { p8: { goals: 2 }, p6: { goals: 1, assists: 2 }, p10: { goals: 1 }, p5: { assists: 1 }, p3: { yellows: 1 } }, "p8",
    { report: "Opening night nerves gone by half time. Okafor's second was a thing of beauty." }),
  R("m2", 35, "Real Ale Madrid", 2, 2, [...XI.slice(0, 8), "p4"],
    { p9: { goals: 1 }, p6: { goals: 1 }, p8: { assists: 1 } }, "p6"),
  R("m3", 28, "Inter Me Hammy", 5, 1, XI,
    { p8: { goals: 3, assists: 1 }, p10: { goals: 1, assists: 1 }, p5: { goals: 1, assists: 2 } }, "p8",
    { report: "Hat-trick for Okafor. Inter Me Hammy pulled one back at the death but never in it." }),
  R("m4", 21, "Borussia Teeth", 0, 3, ["p11", "p2", "p3", "p4", "p5", "p7", "p8", "p9", "p12"],
    { p7: { yellows: 1 }, p2: { yellows: 1 } }, ""),
  R("m5", 14, "Lokomotiv Lager", 3, 0, XI,
    { p10: { goals: 2 }, p6: { goals: 1, assists: 1 }, p9: { assists: 2 } }, "p1",
    { report: "Clean sheet for Hale, who saved a penalty with his face." }),
  R("m6", 7, "Athletico Spanner", 3, 3, [...XI, "p4"],
    { p8: { goals: 1 }, p5: { goals: 1 }, p4: { goals: 1 }, p6: { assists: 2 } }, "p5"),
  { id: "f1", status: "fixture", date: day(3), time: "20:10", opponent: "Real Ale Madrid", venue: "Goals Manchester, Pitch 2", home: false },
  { id: "f2", status: "fixture", date: day(10), time: "19:30", opponent: "Inter Me Hammy", venue: "Goals Manchester, Pitch 4", home: true },
];

// Most of the squad has paid; a few haven't.
const payments = Object.fromEntries(matches.filter(m => m.status === "result").map(m => [
  m.id, Object.fromEntries(m.played.filter(p => !(m.id >= "m5" && ["p9", "p10"].includes(p)) && !(m.id === "m6" && p === "p7")).map(p => [p, true])),
]));

const fines = [
  { id: "x1", playerId: "p9", reason: "Late", emoji: "⏰", amount: 2, date: day(-7), paid: false, createdAt: 6,
    note: "Rolled up at 7:42 for a 7:30 kick-off, still putting his shin pads on during the first goal." },
  { id: "x2", playerId: "p4", reason: "Own goal", emoji: "🙈", amount: 1, date: day(-7), paid: true, createdAt: 5,
    note: "Lovely finish. Wrong end." },
  { id: "x3", playerId: "p7", reason: "Back-chatting ref", emoji: "🗣️", amount: 3, date: day(-21), paid: false, createdAt: 4,
    note: "The ref was right. He was offside by a mile." },
  { id: "x4", playerId: "p2", reason: "Yellow card", emoji: "🟨", amount: 2, date: day(-21), paid: true, createdAt: 3, note: "" },
  { id: "x5", playerId: "p9", reason: "Forgot kit", emoji: "👕", amount: 2, date: day(-28), paid: true, createdAt: 2,
    note: "Played in a Spurs top. Unforgivable." },
  { id: "x6", playerId: "p10", reason: "No-show", emoji: "🚫", amount: 5, date: day(-35), paid: false, createdAt: 1,
    note: "Said he was 'five minutes away' at 7:25. Never arrived." },
];

export function seedDemo() {
  putLocalTeam(DEMO_ID, {
    name: "Dynamo Rovers",
    format: 7,
    colors: { primary: "#e8ff00", secondary: "#111111" },
    crest: null,
    season: { name: "Winter 2026", league: "Monday Night League · Div 2" },
    players, matches, payments, fines,
    lineup: { formation: "2-3-1", slots: ["p1", "p2", "p3", "p5", "p6", "p7", "p8"], bench: ["p9", "p10"] },
    archive: [{
      name: "Summer 2026", closedAt: 1, record: { p: 10, w: 6, d: 1, l: 3, gf: 31, ga: 20 },
      awards: [
        { title: "Golden Boot", icon: "⚽", name: "Sam Okafor", value: 14 },
        { title: "Playmaker", icon: "🎯", name: "Priya Patel", value: 9 },
      ],
      matches: [],
    }],
    settings: { matchFee: "6", payLink: "monzo.me/example" },
    paid: true,
    createdAt: Date.now(),
  });
}
