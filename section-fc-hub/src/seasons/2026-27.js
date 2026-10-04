// ── 2026/27 · Division 1 ─────────────────────────────────────────────────────
// The live season, started Mon 28 Sep 2026.
//
// Each week: add the gameweek to the top of RESULTS, and any fixtures the
// league has published to FIXTURES. The league table is worked out from
// RESULTS, so there's no separate table to keep in step.
//
// Six teams played on the opening night. Pigs and WSOPC FC, who were in
// Division 1 last season, weren't among them.

const RESULTS = [
  { date:"Mon 28 Sep 2026", matches:[
    // Kick-off times and pitches weren't on the league's results page.
    { time:"", home:"SECTION FC", away:"Drew Peacock FC", hg:6, ag:6, pitch:"" },
    { time:"", home:"RBCC FC", away:"Youre getting 5%", hg:4, ag:1, pitch:"" },
    { time:"", home:"Booty & Boys", away:"Karachi Athletic FC", hg:7, ag:3, pitch:"" },
  ]},
];

// Same shape as RESULTS without the scores:
//   { date:"Mon 5 Oct 2026", matches:[{ time:"7:10 PM", home, away, pitch:"Pitch 1" }] }
// None published yet.
const FIXTURES = [];

export const SEASON_2026_27 = {
  id:        "2026-27",
  label:     "2026/27",
  division:  "Division 1",
  startsAt:  Date.UTC(2026, 8, 28),  // Mon 28 Sep 2026
  results:   RESULTS,
  fixtures:  FIXTURES,
};
