// ── Autumn 2026 · Division 1 ─────────────────────────────────────────────────
// The live season: ten gameweeks, Mon 28 Sep to Mon 30 Nov 2026. Six teams,
// each playing the other five home and away.
//
// Each week: move the gameweek from FIXTURES to the top of RESULTS and add
// the scores (hg/ag). The league table is worked out from RESULTS, so there's
// no separate table to keep in step.
//
// Pigs and WSOPC FC, who were in Division 1 last season, aren't in it.

const RESULTS = [
  { date:"Mon 28 Sep 2026", matches:[
    // Kick-off times and pitches weren't on the league's results page.
    { time:"", home:"SECTION FC", away:"Drew Peacock FC", hg:6, ag:6, pitch:"" },
    { time:"", home:"RBCC FC", away:"Youre getting 5%", hg:4, ag:1, pitch:"" },
    { time:"", home:"Booty & Boys", away:"Karachi Athletic FC", hg:7, ag:3, pitch:"" },
  ]},
];

// The league's fixture list, in the order it published it.
const FIXTURES = [
  { date:"Mon 5 Oct 2026", matches:[
    { time:"7:10 PM", home:"Youre getting 5%", away:"Karachi Athletic FC", pitch:"Pitch 1" },
    { time:"7:10 PM", home:"RBCC FC", away:"SECTION FC", pitch:"Pitch 2" },
    { time:"8:30 PM", home:"Drew Peacock FC", away:"Booty & Boys", pitch:"Pitch 2" },
  ]},
  { date:"Mon 12 Oct 2026", matches:[
    { time:"7:50 PM", home:"Drew Peacock FC", away:"RBCC FC", pitch:"Pitch 2" },
    { time:"7:50 PM", home:"Booty & Boys", away:"Youre getting 5%", pitch:"Pitch 1" },
    { time:"8:30 PM", home:"Karachi Athletic FC", away:"SECTION FC", pitch:"Pitch 1" },
  ]},
  { date:"Mon 19 Oct 2026", matches:[
    { time:"7:10 PM", home:"Karachi Athletic FC", away:"Drew Peacock FC", pitch:"Pitch 2" },
    { time:"7:10 PM", home:"SECTION FC", away:"Youre getting 5%", pitch:"Pitch 1" },
    { time:"8:30 PM", home:"RBCC FC", away:"Booty & Boys", pitch:"Pitch 2" },
  ]},
  { date:"Mon 26 Oct 2026", matches:[
    { time:"7:50 PM", home:"Booty & Boys", away:"SECTION FC", pitch:"Pitch 1" },
    { time:"7:50 PM", home:"RBCC FC", away:"Karachi Athletic FC", pitch:"Pitch 2" },
    { time:"8:30 PM", home:"Youre getting 5%", away:"Drew Peacock FC", pitch:"Pitch 1" },
  ]},
  { date:"Mon 2 Nov 2026", matches:[
    { time:"7:10 PM", home:"Drew Peacock FC", away:"SECTION FC", pitch:"Pitch 1" },
    { time:"7:10 PM", home:"Youre getting 5%", away:"RBCC FC", pitch:"Pitch 2" },
    { time:"8:30 PM", home:"Karachi Athletic FC", away:"Booty & Boys", pitch:"Pitch 2" },
  ]},
  { date:"Mon 9 Nov 2026", matches:[
    { time:"7:50 PM", home:"Booty & Boys", away:"Drew Peacock FC", pitch:"Pitch 1" },
    { time:"7:50 PM", home:"Karachi Athletic FC", away:"Youre getting 5%", pitch:"Pitch 2" },
    { time:"8:30 PM", home:"SECTION FC", away:"RBCC FC", pitch:"Pitch 1" },
  ]},
  { date:"Mon 16 Nov 2026", matches:[
    { time:"7:10 PM", home:"RBCC FC", away:"Drew Peacock FC", pitch:"Pitch 1" },
    { time:"7:10 PM", home:"SECTION FC", away:"Karachi Athletic FC", pitch:"Pitch 2" },
    { time:"8:30 PM", home:"Youre getting 5%", away:"Booty & Boys", pitch:"Pitch 2" },
  ]},
  { date:"Mon 23 Nov 2026", matches:[
    { time:"7:50 PM", home:"Booty & Boys", away:"RBCC FC", pitch:"Pitch 1" },
    { time:"7:50 PM", home:"Youre getting 5%", away:"SECTION FC", pitch:"Pitch 2" },
    { time:"8:30 PM", home:"Drew Peacock FC", away:"Karachi Athletic FC", pitch:"Pitch 1" },
  ]},
  { date:"Mon 30 Nov 2026", matches:[
    { time:"7:10 PM", home:"Drew Peacock FC", away:"Youre getting 5%", pitch:"Pitch 2" },
    { time:"7:10 PM", home:"Karachi Athletic FC", away:"RBCC FC", pitch:"Pitch 1" },
    { time:"8:30 PM", home:"SECTION FC", away:"Booty & Boys", pitch:"Pitch 2" },
  ]},
];

export const SEASON_AUTUMN_2026 = {
  id:        "autumn-2026",
  label:     "Autumn 2026",
  division:  "Division 1",
  startsAt:  Date.UTC(2026, 8, 28),  // Mon 28 Sep 2026
  results:   RESULTS,
  fixtures:  FIXTURES,
};
