// ── 2026 · Division 1 ───────────────────────────────────────────────────────
// Mon 4 May – Mon 21 Sep 2026. Finished sixth, a point above Karachi.
//
// This season is closed, so nothing in here changes again. The 2026 Review
// screen and the 2026 views on Results, Table and Squad Stats read from this
// file rather than from the live data, which belongs to 2026/27 now.

// Final Division 1 table, 2026 season.
// Mon 21 Sep 2026 was the last gameweek. We have our own result and we know
// Pigs beat Karachi Athletic; that scoreline and the other two ties
// (Youre getting 5% v RBCC, WSOPC v Drew Peacock) weren't posted, so those
// teams still read 20 games and Pigs/Karachi keep their GF-GA from GW20.
// Nothing outstanding can change the order.
const LEAGUE_TABLE = [
  { pos:1, team:"Pigs", pl:21, w:20, d:1, l:0, gf:135, ga:25, gd:110, pts:61 },
  { pos:2, team:"Youre getting 5%", pl:20, w:12, d:1, l:7, gf:118, ga:74, gd:44, pts:37 },
  { pos:3, team:"Drew Peacock FC", pl:20, w:11, d:1, l:8, gf:97, ga:86, gd:11, pts:34 },
  { pos:4, team:"RBCC FC", pl:20, w:10, d:2, l:8, gf:74, ga:60, gd:14, pts:32 },
  { pos:5, team:"Booty & Boys", pl:21, w:8, d:1, l:12, gf:87, ga:106, gd:-19, pts:25 },
  { pos:6, team:"SECTION FC", pl:21, w:7, d:3, l:11, gf:76, ga:94, gd:-18, pts:24 },
  { pos:7, team:"Karachi Athletic FC", pl:21, w:7, d:2, l:12, gf:93, ga:100, gd:-7, pts:23 },
  { pos:8, team:"WSOPC FC", pl:20, w:1, d:1, l:18, gf:44, ga:179, gd:-135, pts:4 },
];

const PAST_RESULTS = [
  { date:"Mon 21 Sep 2026", matches:[
    // Final day. Only our tie is listed — Pigs beat Karachi Athletic but the
    // score never came through, and the other two results aren't in either.
    { time:"7:50 PM", home:"Booty & Boys", away:"SECTION FC", hg:2, ag:6, pitch:"Pitch 2" },
  ]},
  { date:"Mon 14 Sep 2026", matches:[
    { time:"6:30 PM", home:"WSOPC FC", away:"Booty & Boys", hg:0, ag:5, pitch:"Pitch 2" },
    // The league's results page has this one down as 4-2. The gaffa's report
    // says 5-2 and names five scorers, so 5-2 it is — same as the 6-6 at
    // Karachi, which the results page also had wrong.
    { time:"7:10 PM", home:"SECTION FC", away:"Youre getting 5%", hg:5, ag:2, pitch:"Pitch 1" },
    { time:"7:10 PM", home:"Drew Peacock FC", away:"Pigs", hg:0, ag:7, pitch:"Pitch 2" },
    { time:"7:50 PM", home:"RBCC FC", away:"Karachi Athletic FC", hg:5, ag:1, pitch:"Pitch 1" },
  ]},
  { date:"Mon 7 Sep 2026", matches:[
    { time:"6:30 PM", home:"RBCC FC", away:"Drew Peacock FC", hg:1, ag:3, pitch:"Pitch 1" },
    { time:"6:30 PM", home:"Karachi Athletic FC", away:"SECTION FC", hg:6, ag:6, pitch:"Pitch 2" },
    { time:"7:50 PM", home:"Booty & Boys", away:"Youre getting 5%", hg:2, ag:5, pitch:"Pitch 2" },
    { time:"8:30 PM", home:"Pigs", away:"WSOPC FC", hg:17, ag:0, pitch:"Pitch 1" },
  ]},
  { date:"Mon 31 Aug 2026", matches:[
    { time:"6:30 PM", home:"Pigs", away:"Booty & Boys", hg:4, ag:1, pitch:"Pitch 2" },
    { time:"7:10 PM", home:"Youre getting 5%", away:"Karachi Athletic FC", hg:11, ag:5, pitch:"Pitch 1" },
    { time:"7:10 PM", home:"WSOPC FC", away:"RBCC FC", hg:0, ag:5, pitch:"Pitch 2" },
    { time:"7:50 PM", home:"SECTION FC", away:"Drew Peacock FC", hg:6, ag:4, pitch:"Pitch 1" },
  ]},
  { date:"Mon 24 Aug 2026", matches:[
    { time:"6:30 PM", home:"SECTION FC", away:"WSOPC FC", hg:6, ag:2, pitch:"Pitch 1" },
    { time:"7:10 PM", home:"Drew Peacock FC", away:"Youre getting 5%", hg:4, ag:9, pitch:"Pitch 2" },
    { time:"7:50 PM", home:"Booty & Boys", away:"Karachi Athletic FC", hg:0, ag:5, pitch:"Pitch 2" },
    { time:"8:30 PM", home:"RBCC FC", away:"Pigs", hg:0, ag:7, pitch:"Pitch 1" },
  ]},
  { date:"Mon 17 Aug 2026", matches:[
    { time:"6:30 PM", home:"RBCC FC", away:"Booty & Boys", hg:4, ag:2, pitch:"Pitch 2" },
    { time:"7:10 PM", home:"Karachi Athletic FC", away:"Drew Peacock FC", hg:10, ag:4, pitch:"Pitch 1" },
    { time:"7:10 PM", home:"Pigs", away:"SECTION FC", hg:4, ag:1, pitch:"Pitch 2" },
    { time:"7:50 PM", home:"Youre getting 5%", away:"WSOPC FC", hg:12, ag:4, pitch:"Pitch 1" },
  ]},
  { date:"Mon 10 Aug 2026", matches:[
    { time:"6:30 PM", home:"Youre getting 5%", away:"Pigs", hg:2, ag:3, pitch:"Pitch 1" },
    { time:"7:50 PM", home:"Booty & Boys", away:"Drew Peacock FC", hg:7, ag:4, pitch:"Pitch 2" },
    { time:"7:50 PM", home:"WSOPC FC", away:"Karachi Athletic FC", hg:6, ag:10, pitch:"Pitch 1" },
    { time:"8:30 PM", home:"SECTION FC", away:"RBCC FC", hg:5, ag:0, pitch:"Pitch 1" },
  ]},
  { date:"Mon 3 Aug 2026", matches:[
    { time:"6:30 PM", home:"SECTION FC", away:"Booty & Boys", hg:5, ag:5, pitch:"Pitch 2" },
    { time:"7:10 PM", home:"RBCC FC", away:"Youre getting 5%", hg:7, ag:4, pitch:"Pitch 2" },
    { time:"7:10 PM", home:"Drew Peacock FC", away:"WSOPC FC", hg:11, ag:5, pitch:"Pitch 1" },
    { time:"7:50 PM", home:"Karachi Athletic FC", away:"Pigs", hg:1, ag:6, pitch:"Pitch 1" },
  ]},
  { date:"Mon 27 Jul 2026", matches:[
    { time:"6:30 PM", home:"Karachi Athletic FC", away:"RBCC FC", hg:3, ag:3, pitch:"Pitch 1" },
    { time:"7:10 PM", home:"Pigs", away:"Drew Peacock FC", hg:5, ag:0, pitch:"Pitch 1" },
    { time:"7:50 PM", home:"Booty & Boys", away:"WSOPC FC", hg:13, ag:3, pitch:"Pitch 2" },
    { time:"8:30 PM", home:"Youre getting 5%", away:"SECTION FC", hg:9, ag:4, pitch:"Pitch 1" },
  ]},
  { date:"Mon 20 Jul 2026", matches:[
    { time:"6:30 PM", home:"Youre getting 5%", away:"Booty & Boys", hg:12, ag:4, pitch:"Pitch 2" },
    { time:"7:10 PM", home:"WSOPC FC", away:"Pigs", hg:2, ag:18, pitch:"Pitch 1" },
    { time:"7:10 PM", home:"SECTION FC", away:"Karachi Athletic FC", hg:3, ag:2, pitch:"Pitch 2" },
    { time:"7:50 PM", home:"Drew Peacock FC", away:"RBCC FC", hg:2, ag:2, pitch:"Pitch 1" },
  ]},
  { date:"Mon 13 Jul 2026", matches:[
    { time:"", home:"Drew Peacock FC", away:"SECTION FC", hg:4, ag:1, pitch:"" },
    { time:"", home:"Booty & Boys", away:"Pigs", hg:2, ag:5, pitch:"" },
    { time:"", home:"Karachi Athletic FC", away:"Youre getting 5%", hg:2, ag:7, pitch:"" },
    { time:"", home:"RBCC FC", away:"WSOPC FC", hg:7, ag:0, pitch:"" },
  ]},
  { date:"Mon 6 Jul 2026", matches:[
    { time:"", home:"Karachi Athletic FC", away:"Booty & Boys", hg:3, ag:11, pitch:"" },
    { time:"", home:"Pigs", away:"RBCC FC", hg:3, ag:1, pitch:"" },
    { time:"", home:"WSOPC FC", away:"SECTION FC", hg:3, ag:2, pitch:"" },
    { time:"", home:"Youre getting 5%", away:"Drew Peacock FC", hg:3, ag:5, pitch:"" },
  ]},
  { date:"Mon 29 Jun 2026", matches:[
    { time:"6:30 PM", home:"WSOPC FC", away:"Youre getting 5%", hg:0, ag:5, pitch:"Pitch 1" },
    { time:"7:50 PM", home:"Booty & Boys", away:"RBCC FC", hg:4, ag:7, pitch:"Pitch 2" },
    { time:"7:50 PM", home:"Drew Peacock FC", away:"Karachi Athletic FC", hg:4, ag:1, pitch:"Pitch 1" },
    { time:"8:30 PM", home:"SECTION FC", away:"Pigs", hg:2, ag:6, pitch:"Pitch 2" },
  ]},
  { date:"Mon 22 Jun 2026", matches:[
    { time:"6:30 PM", home:"Drew Peacock FC", away:"Booty & Boys", hg:4, ag:7, pitch:"Pitch 2" },
    { time:"7:10 PM", home:"RBCC FC", away:"SECTION FC", hg:6, ag:5, pitch:"Pitch 1" },
    { time:"7:10 PM", home:"Karachi Athletic FC", away:"WSOPC FC", hg:6, ag:3, pitch:"Pitch 2" },
    { time:"7:50 PM", home:"Pigs", away:"Youre getting 5%", hg:4, ag:4, pitch:"Pitch 1" },
  ]},
  { date:"Mon 15 Jun 2026", matches:[
    { time:"6:30 PM", home:"Pigs", away:"Karachi Athletic FC", hg:5, ag:4, pitch:"Pitch 1" },
    { time:"7:10 PM", home:"Youre getting 5%", away:"RBCC FC", hg:6, ag:1, pitch:"Pitch 2" },
    { time:"7:50 PM", home:"Booty & Boys", away:"SECTION FC", hg:0, ag:5, pitch:"Pitch 2" },
    { time:"8:30 PM", home:"WSOPC FC", away:"Drew Peacock FC", hg:5, ag:11, pitch:"Pitch 1" },
  ]},
  { date:"Mon 8 Jun 2026", matches:[
    { time:"6:30 PM", home:"WSOPC FC", away:"Booty & Boys", hg:5, ag:7, pitch:"Pitch 2" },
    { time:"7:10 PM", home:"Drew Peacock FC", away:"Pigs", hg:2, ag:4, pitch:"Pitch 2" },
    { time:"7:10 PM", home:"SECTION FC", away:"Youre getting 5%", hg:2, ag:6, pitch:"Pitch 1" },
    { time:"7:50 PM", home:"RBCC FC", away:"Karachi Athletic FC", hg:2, ag:3, pitch:"Pitch 1" },
  ]},
  { date:"Mon 1 Jun 2026", matches:[
    { time:"6:30 PM", home:"RBCC FC", away:"Drew Peacock FC", hg:3, ag:5, pitch:"Pitch 1" },
    { time:"6:30 PM", home:"Karachi Athletic FC", away:"SECTION FC", hg:6, ag:4, pitch:"Pitch 2" },
    { time:"7:50 PM", home:"Booty & Boys", away:"Youre getting 5%", hg:7, ag:5, pitch:"Pitch 2" },
    { time:"8:30 PM", home:"Pigs", away:"WSOPC FC", hg:13, ag:0, pitch:"Pitch 1" },
  ]},
  { date:"Mon 25 May 2026", matches:[
    { time:"6:30 PM", home:"Pigs", away:"Booty & Boys", hg:5, ag:0, pitch:"Pitch 2" },
    { time:"7:10 PM", home:"Youre getting 5%", away:"Karachi Athletic FC", hg:6, ag:3, pitch:"Pitch 1" },
    { time:"7:10 PM", home:"WSOPC FC", away:"RBCC FC", hg:0, ag:5, pitch:"Pitch 2" },
    { time:"7:50 PM", home:"SECTION FC", away:"Drew Peacock FC", hg:3, ag:10, pitch:"Pitch 1" },
  ]},
  { date:"Mon 18 May 2026", matches:[
    { time:"6:30 PM", home:"Booty & Boys", away:"Karachi Athletic FC", hg:4, ag:3, pitch:"Pitch 1" },
    { time:"7:10 PM", home:"Drew Peacock FC", away:"Youre getting 5%", hg:3, ag:1, pitch:"Pitch 2" },
    { time:"7:50 PM", home:"SECTION FC", away:"WSOPC FC", hg:3, ag:3, pitch:"Pitch 2" },
    { time:"8:30 PM", home:"RBCC FC", away:"Pigs", hg:2, ag:3, pitch:"Pitch 1" },
  ]},
  { date:"Mon 11 May 2026", matches:[
    { time:"6:30 PM", home:"RBCC FC", away:"Booty & Boys", hg:8, ag:2, pitch:"Pitch 2" },
    { time:"7:10 PM", home:"Pigs", away:"SECTION FC", hg:9, ag:0, pitch:"Pitch 2" },
    { time:"7:10 PM", home:"Karachi Athletic FC", away:"Drew Peacock FC", hg:4, ag:9, pitch:"Pitch 1" },
    { time:"7:50 PM", home:"Youre getting 5%", away:"WSOPC FC", hg:8, ag:2, pitch:"Pitch 1" },
  ]},
  { date:"Mon 4 May 2026", matches:[
    { time:"6:30 PM", home:"Youre getting 5%", away:"Pigs", hg:1, ag:7, pitch:"Pitch 1" },
    { time:"7:50 PM", home:"Booty & Boys", away:"Drew Peacock FC", hg:2, ag:8, pitch:"Pitch 2" },
    { time:"7:50 PM", home:"WSOPC FC", away:"Karachi Athletic FC", hg:1, ag:15, pitch:"Pitch 1" },
    { time:"8:30 PM", home:"SECTION FC", away:"RBCC FC", hg:2, ag:5, pitch:"Pitch 1" },
  ]},
];

// Final season totals for everyone who made an appearance, copied out of the
// live Firestore `stats` collection on Sun 4 Oct 2026 before it was zeroed for
// 2026/27. They only count what went into match reports, which is why the 56
// goals here fall short of the 76 in the table above.
const FINAL_STATS = {
  "George Mcnulty": { apps:15, goals: 8, assists:3, yellows:0, reds:0, cleanSheets:0, motm:4 },
  "Hayden Hunter":  { apps:13, goals: 9, assists:3, yellows:0, reds:0, cleanSheets:0, motm:2 },
  "Tom Goldsby":    { apps:13, goals: 4, assists:2, yellows:0, reds:0, cleanSheets:0, motm:1 },
  "Guy Horton":     { apps:13, goals: 1, assists:4, yellows:0, reds:0, cleanSheets:0, motm:0 },
  "Jeven Dhillon":  { apps:12, goals: 0, assists:2, yellows:0, reds:0, cleanSheets:0, motm:0 },
  "Ben Higgs":      { apps:11, goals: 7, assists:4, yellows:0, reds:0, cleanSheets:0, motm:1 },
  "Mooney":         { apps: 7, goals:13, assists:2, yellows:0, reds:0, cleanSheets:0, motm:1 },
  "Rohan Naal":     { apps: 6, goals: 0, assists:2, yellows:0, reds:0, cleanSheets:0, motm:0 },
  "Josh Allenby":   { apps: 5, goals: 4, assists:2, yellows:0, reds:0, cleanSheets:0, motm:1 },
  "Mo":             { apps: 3, goals: 5, assists:2, yellows:0, reds:0, cleanSheets:0, motm:1 },
  "Chiz":           { apps: 3, goals: 3, assists:0, yellows:0, reds:0, cleanSheets:0, motm:0 },
  "Evan Von":       { apps: 2, goals: 0, assists:0, yellows:0, reds:0, cleanSheets:0, motm:0 },
  "Freddie Palmer": { apps: 1, goals: 1, assists:0, yellows:0, reds:0, cleanSheets:0, motm:0 },
  "Max Murray":     { apps: 1, goals: 1, assists:0, yellows:0, reds:0, cleanSheets:0, motm:0 },
  "Akiat":          { apps: 1, goals: 0, assists:0, yellows:0, reds:0, cleanSheets:0, motm:0 },
  "Archie Bayliss": { apps: 1, goals: 0, assists:0, yellows:0, reds:0, cleanSheets:0, motm:0 },
  "Dani Griffiths": { apps: 1, goals: 0, assists:0, yellows:0, reds:0, cleanSheets:0, motm:0 },
  "Hugo Hansen":    { apps: 1, goals: 0, assists:0, yellows:0, reds:0, cleanSheets:0, motm:0 },
  "Josh Treharne":  { apps: 1, goals: 0, assists:0, yellows:0, reds:0, cleanSheets:0, motm:0 },
  "Tom Beeston":    { apps: 1, goals: 0, assists:0, yellows:0, reds:0, cleanSheets:0, motm:0 },
};

// The words on the 2026 Review screen. Every number on that page comes from
// the table, results and final stats above, so the two can't disagree.
const SEASON_REVIEW = {
  season:   "2026",
  division: "Division 1",
  title:    "SECTION FC v THE WORLD",
  verdict:  "SURVIVED",
  // The night it turned: SECTION FC 3-2 Karachi Athletic FC, "we are back".
  // The Season screen splits the campaign here.
  turnDate: "Mon 20 Jul 2026",
  standfirst: "One win in the first eleven. Twenty points from the last ten. Division 1 football next season.",

  story: [
    "For three months this season looked finished. Nine defeats in the first eleven, nine conceded at the Pigs, ten shipped to Drew Peacock, and a squad that some weeks could barely put five on the pitch, never mind a sub. Every table you looked at had us in the bottom two and every neutral had us down for the drop.",
    "Then it turned. Karachi beaten 3-2 in July — \"we are back\" — and from that night on this was a different team. Five past RBCC. Six past WSOPC. Six past Drew Peacock in the most savage performance the club has put in. Six at Karachi to claw back a point when the season was on the line. Five past Youre getting 5% when we had to win. And six at Booty & Boys on the final day to finish it.",
    "Four points from the first eleven games. Twenty from the last ten. Karachi were five clear with three to play and finished a point behind us. That is not a run of form — that is a group of players deciding, collectively, that they were not going down.",
    "It came down to the last night with everything still live, and only one combination did it: beat Booty & Boys and have Karachi lose to the Pigs. A draw for them would have been enough to finish above us on goal difference. We won 6-2. Karachi lost. Sixth in Division 1, a point clear of them, safe — on the only result in the league that would have done it.",
  ],

  // Written by hand — one for everyone who pulled on the shirt this season.
  props: [
    { name:"Jeven Dhillon",  tag:"🧤 The last line",         text:"Finished with a 9.5 in a 6-2, and that is the easy one to remember. The ones that mattered came in the worst of the summer, standing in a defence that was getting overrun, taking the scoreline on the chin and coming back the next Monday for more of it. Commanded his box all night on the last day." },
    { name:"Tom Goldsby",    tag:"⭐ Ever-present",           text:"In every squad sheet from the July wreckage to the last kick of the season. A 9.5 and Man of the Match in the finale, a goal in the 6-6 at Karachi, assists in the big wins. You do not make a run like this without someone who is simply there, at the same level, every week. That was Goldsby." },
    { name:"George Mcnulty", tag:"Never missed",             text:"More appearances than anyone in the squad, more Man of the Match awards than anyone, and not one of them phoned in. Two in the 6-4 against Drew Peacock, Man of the Match in the 6-6 at Karachi, another 9 in the finale. Played in the 1-4 at the Pigs and played in the six-goal win over Booty & Boys, at the same level in both." },
    { name:"Mooney",         tag:"⚽ The goals",              text:"Thirteen goals in seven games, including a hat-trick and two assists in the 6-4 that convinced everyone this was actually on. Walked into a losing side and turned us into a team other sides had to defend against. Plenty of people can claim a piece of this turnaround. Only one of them scored thirteen." },
    { name:"Josh Allenby",   tag:"Defender, allegedly",      text:"Four goals and two assists in five games from the back, Man of the Match in the Drew Peacock demolition, and 9s in games we lost. Came in when the squad was at its thinnest and played like he had been here all season." },
    { name:"Ben Higgs",      tag:"⚽ Big game man",           text:"Scored in the thick of the bad run and scored twice in the must-win against Youre getting 5%. Man of the Match in a 1-4 at the Pigs, which tells you everything — a 9 in a beating, because he does not stop. On the sheet again on the last day." },
    { name:"Hayden Hunter",  tag:"⚽ In the right place",      text:"Two in the 6-6 at Karachi when we were chasing it and a point was worth its weight, and one more in the finale. One of the few who was there through the worst of it and still there to see the job finished." },
    { name:"Mo",             tag:"⚽⚽ Ruthless",              text:"Man of the Match on debut with a goal and two assists in the 3-2 that started the whole thing. Two in the 5-2. Two more on the last day. A record that reads like a typo. Whatever we did to get him here, do it again next season." },
    { name:"Chiz",           tag:"⚽ Instant impact",         text:"Debut at Karachi in September with the season hanging by a thread, and scored. Then scored in the 5-2. Then scored in the finale. Three games, three goals — and all three of them games we could not afford to lose." },
    { name:"Rohan Naal",     tag:"Wherever you need him",    text:"Went in goal against Youre getting 5% because there was nobody else — \"beaten down but we've found a new keeper.\" Then played out at the back against Drew Peacock and came away with an assist and a 9.5. Two completely different jobs, no fuss about either." },
    { name:"Freddie Palmer", tag:"⚽ Played once",            text:"Played once, in the 5-5 with Booty & Boys, and scored." },
    { name:"Tom Beeston",    tag:"Played once",              text:"Played once, away at WSOPC on 6 July." },
    { name:"Akiat",          tag:"Played once",              text:"Played once, away at Karachi on 7 September." },
    { name:"Evan Von",       tag:"Played twice",             text:"Played twice this season." },
    { name:"Max Murray",     tag:"⚽ Played once",            text:"Played once, and scored." },
    { name:"Josh Treharne",  tag:"Played once",              text:"Played once in Division 1 this season, away at RBCC on 4 May." },
    { name:"Dani Griffiths", tag:"Played once",              text:"Played once this season." },
    { name:"Hugo Hansen",    tag:"Played once",              text:"Played once this season." },
    { name:"Archie Bayliss", tag:"Played once",              text:"Played once this season." },
    { name:"Guy Horton",     tag:"The gaffa in boots",       text:"Easy to forget he played nearly every week as well as picking the side. Centre half most of the season, in goal against Drew Peacock because we had no keeper, and a goal in the 3-2 at Karachi that got all of this moving. A 9 on the last day, in a report he wrote himself." },
  ],

  manager: {
    name: "Guy Horton",
    tag:  "🏅 Manager of the Month",
    text: [
      "Four points from eleven games. An emergency board meeting into his own contract after the 6-6 at Karachi. No bench, no settled keeper, and a results column that had been red since May. Most managers would have been gone by August, and plenty would have walked long before that.",
      "Instead he kept naming a team every Monday, kept the group together through 0-9 and 3-10, found Mo, found Chiz, found Mooney, put Rohan in goal when there was no keeper and went in goal himself when there still was not one. Changed how we set up, and a side that had been conceding at will took twenty points from the last ten.",
      "He did all of it while playing centre half, and finished the season with a 9 of his own. Sixth, above Karachi, and Division 1 again next year. Manager of the Month, and the gaffa who got us over the line.",
    ],
  },

  signoff: "The comeback to end all comebacks. Section FC v the world — and the world blinked. 🟡⚫",
};

export const SEASON_2026 = {
  id:        "2026",
  label:     "2026",
  division:  "Division 1",
  startsAt:  Date.UTC(2026, 4, 4),   // Mon 4 May 2026
  table:     LEAGUE_TABLE,
  tableNote: "Final table. Four teams stayed on 20 games — their last results were never posted.",
  results:   PAST_RESULTS,
  stats:     FINAL_STATS,
  review:    SEASON_REVIEW,
};
