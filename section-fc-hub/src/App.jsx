import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from './firebase';
import {
  doc, collection, onSnapshot, setDoc, updateDoc, getDoc, deleteDoc, increment
} from 'firebase/firestore';
import { ShareButton, useShareableCard } from './share';
import { SEASON_2026 } from './seasons/2026';
import { SEASON_AUTUMN_2026 } from './seasons/autumn-2026';

// ── Constants ────────────────────────────────────────────────────────────────
const ADMIN_PIN = 'sfc2024'; // Change this to your own PIN

const PLAYER_IMGS = {
  "Matt Lampitt":    "/players/matt-lampitt.jpg",
  "Rohan Naal":      "/players/rohan-naal.jpg",
  "Tom Goldsby":     "/players/tom-goldsby.jpg",
  "Josh Treharne":   "/players/josh-treharne.jpg",
  "Ben Higgs":       "/players/ben-higgs.jpg",
  "Jeven Dhillon":   "/players/jeven-dhillon.jpg",
  "George Mcnulty":  "/players/george-mcnulty.jpg",
  "Dani Griffiths":  "/players/dani-griffiths.jpg",
  "Hugo Hansen":     "/players/hugo-hansen.jpg",
  "Hayden Hunter":   "/players/hayden-hunter.jpg",
  "Lewis Fowler":    "/players/lewis-fowler.jpg",
  "Guy Horton":      "/players/guy-horton.jpg",
  "Max Murray":      "/players/max-murray.jpg",
  "Ian Healey":      "/players/ian-healey.jpg",
  "Freddie Palmer":  "/players/freddie-palmer.jpg",
  "Jake Graham":     "/players/jake-graham.jpg",
  "Callum Dagnall":  "/players/callum-dagnall.jpg",
  "Tom Beeston":     "/players/tom-beeston.jpg",
  "Mooney":          "/players/mooney.jpg",
  "Ollie McBall":    "/players/ollie-mcball.jpg",
  "Evan Von":        "/players/evan-von.jpg",
  "Akiat":           null,
  "Chiz":            null,
  "Mo":              null,
  // Both have stats records from this season but were never in this list, so
  // they never showed up on the stats table or in Player Form. No photos yet.
  "Josh Allenby":    null,
  "Archie Bayliss":  null,
  // Debut in the 6-6 with Drew Peacock on the opening night of Autumn 2026.
  "Lee Trundle":     null,
};

// Who runs the side. Hayden Hunter is assistant manager while Dani Griffiths
// is out injured; shown on the home screen and against their names on the
// stats tables.
const STAFF = [
  { role:"Manager",           name:"Guy Horton" },
  { role:"Assistant Manager", name:"Hayden Hunter", note:"Stepping up while Dani Griffiths is out injured" },
];
const INJURED = ["Dani Griffiths"];
const STAFF_SHORT = { "Manager":"MANAGER", "Assistant Manager":"ASST MANAGER" };
const playerTag = name => {
  const s = STAFF.find(x => x.name === name);
  if (s) return { label: STAFF_SHORT[s.role] || s.role.toUpperCase(), color: "#e8ff00" };
  if (INJURED.includes(name)) return { label: "INJURED", color: "#ff8866" };
  return null;
};

// ── Seasons ──────────────────────────────────────────────────────────────────
// League data lives in src/seasons/, one file per season. SEASON is the live
// one, and that's the file the weekly results go in. ARCHIVE is every closed
// season, newest first, for the season switches on Results, Table and Squad
// Stats.
const SEASON  = SEASON_AUTUMN_2026;
const ARCHIVE = [SEASON_2026];
const SEASONS = [SEASON, ...ARCHIVE];

// Works a league table out from a season's results: points, then goal
// difference, then goals scored. Teams level on all three share a position.
const buildTable = results => {
  const rows = {};
  const row = team => (rows[team] ??= { team, pl:0, w:0, d:0, l:0, gf:0, ga:0 });
  results.forEach(gw => gw.matches.forEach(m => {
    const h = row(m.home), a = row(m.away);
    h.pl++; a.pl++;
    h.gf += m.hg; h.ga += m.ag;
    a.gf += m.ag; a.ga += m.hg;
    if (m.hg > m.ag)      { h.w++; a.l++; }
    else if (m.hg < m.ag) { a.w++; h.l++; }
    else                  { h.d++; a.d++; }
  }));
  const sorted = Object.values(rows)
    .map(r => ({ ...r, gd: r.gf - r.ga, pts: r.w * 3 + r.d }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
  let pos = 0;
  return sorted.map((r, i) => {
    const prev = sorted[i - 1];
    if (!prev || prev.pts !== r.pts || prev.gd !== r.gd || prev.gf !== r.gf) pos = i + 1;
    return { pos, ...r };
  });
};
// A closed season keeps the league's own final table; the live one is built.
const tableFor = s => s.table || buildTable(s.results);
// "=3" when another team shares the position.
const posLabel = (row, table) => `${table.some(t => t !== row && t.pos === row.pos) ? "=" : ""}${row.pos}`;
const ordinal  = n => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th","st","nd","rd"][n % 10] || "th");

const PAST_RESULTS = SEASON.results;
const FIXTURES     = SEASON.fixtures;
const LEAGUE_TABLE = tableFor(SEASON);

const AWARDS = [
  { id:"golden_boot", name:"Golden Boot",  icon:"⚽", color:"#FFD700", glow:"#FFD70055", desc:"Top Scorer of the Season"       },
  { id:"assist_king", name:"Assist King",  icon:"👑", color:"#e8ff00", glow:"#e8ff0044", desc:"Most Assists of the Season"     },
  { id:"mr_reliable", name:"Mr. Reliable", icon:"🛡️", color:"#60cfff", glow:"#60cfff44", desc:"Most Appearances"               },
  { id:"danger_man",  name:"Danger Man",   icon:"🟨", color:"#ff5544", glow:"#ff554444", desc:"Most Cards — Living Dangerously" },
  { id:"safe_hands",  name:"Safe Hands",   icon:"🧤", color:"#44dd88", glow:"#44dd8844", desc:"Most Clean Sheets"              },
];

const OPP_POOL = {
  GK:  ["Buffon","Schmeichel","Casillas","Neuer","Yashin","Kahn","Banks","Barthez","Zoff"],
  DEF: ["Maldini","Beckenbauer","Ramos","Terry","Ferdinand","Puyol","Baresi","Cannavaro","Moore","Van Dijk","Cafu","Lahm","Thuram"],
  MID: ["Zidane","Pirlo","Gerrard","Lampard","Vieira","Scholes","Keane","Modric","De Bruyne","Kroos","Xavi","Iniesta","Platini","Alonso"],
  ATT: ["Pelé","Maradona","R. Nazário","Messi","Henry","Ronaldinho","Ibrahimović","Rooney","Drogba","Van Basten","Müller","Eusébio","Neymar","Salah","C. Ronaldo","Lewandowski"],
};
const SFC_POS  = ["GK","DEF","DEF","ATT","ATT"];
const OPP_POS  = ["GK","DEF","MID","MID","ATT"];
const SFC_XY   = [[50,87],[25,74],[75,74],[25,60],[75,60]];
const OPP_XY   = [[50,11],[50,25],[28,38],[72,38],[50,49]];
const KNOWN_PLAYERS = Object.keys(PLAYER_IMGS);
const STAT_KEYS   = ["apps","goals","assists","yellows","reds","cleanSheets","motm"];
const STAT_LABELS = {apps:"Apps",goals:"Goals",assists:"Assists",yellows:"Yellows",reds:"Reds",cleanSheets:"Clean Sheets",motm:"MOTM"};
// Sorts players by one stat; ties fall back to goals, then MOTM, then name.
const byStat = (data, key) => (a, b) =>
  (data[b][key] || 0) - (data[a][key] || 0) ||
  (data[b].goals || 0) - (data[a].goals || 0) ||
  (data[b].motm || 0) - (data[a].motm || 0) ||
  a.localeCompare(b);
const initStats   = () => Object.fromEntries(KNOWN_PLAYERS.map(p => [p, {apps:0,goals:0,assists:0,yellows:0,reds:0,cleanSheets:0,motm:0}]));
const getRatingColor = r => r>=9.9?'#00d4ff':r>=8.8?'#22aa44':r>=7.6?'#55dd66':r>=6.6?'#e8d060':r>=5.6?'#cc8800':r>=4.6?'#ff8800':'#ff3333';
const PW=300, PH=460, BX=338;
const ptX = p => (p/100)*PW;
const ptY = p => (p/100)*PH;
const benchY = (i,t) => (PH/2)+(i-(t-1)/2)*82;
const pickRand = (arr,ex=[]) => { const p=arr.filter(x=>!ex.includes(x)); return (p.length?p:arr)[~~(Math.random()*(p.length||arr.length))]; };
const buildOpp = () => { const u=[]; return OPP_POS.map(pos=>{ const n=pickRand(OPP_POOL[pos],u); u.push(n); return {name:n,pos}; }); };
const oppSlug = name => (name||"").trim().toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_+|_+$/g,"");
const mergeOppRoster = saved => {
  const used = [];
  return OPP_POS.map((pos, i) => {
    const sv = saved && saved[i];
    if (sv && sv.name && typeof sv.name === "string" && sv.name.trim()) {
      used.push(sv.name);
      return { name: sv.name, pos };
    }
    const n = pickRand(OPP_POOL[pos], used);
    used.push(n);
    return { name: n, pos };
  });
};
const lastWord  = n => n.split(" ").pop();
const firstWord = n => n.split(" ")[0];
const avatar    = n => PLAYER_IMGS[n] || null;
const isSFC     = t => t === "SECTION FC";

// Every SECTION FC result of a season, oldest first, pulled straight out of
// its results so the review screen can never disagree with the results page.
const seasonRun = results => [...results].reverse().flatMap(gw =>
  gw.matches
    .filter(m => isSFC(m.home) || isSFC(m.away))
    .map(m => {
      const home = isSFC(m.home);
      const gf = home ? m.hg : m.ag;
      const ga = home ? m.ag : m.hg;
      return {
        date: gw.date,
        opp:  home ? m.away : m.home,
        home, gf, ga,
        res: gf > ga ? "W" : gf < ga ? "L" : "D",
      };
    })
);

// Day number for dates written like "Mon 28 Sep 2026" or "Tue, 9 Jun 2026".
// Parsed by hand: browsers don't agree on how to read that format.
const MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
const dayOf = str => {
  const m = String(str || "").match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  const mon = m && MONTHS[m[2].toLowerCase()];
  return m && mon != null ? Date.UTC(+m[3], mon, +m[1]) / 86400000 : null;
};
// "YOU’RE GETTING 5%" and "Youre getting 5%" are the same team.
const teamKey = t => String(t || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Sums a slice of that run into a W/D/L + goals + points block.
const runTotals = games => games.reduce((a, g) => ({
  pl: a.pl + 1,
  w:  a.w + (g.res === "W" ? 1 : 0),
  d:  a.d + (g.res === "D" ? 1 : 0),
  l:  a.l + (g.res === "L" ? 1 : 0),
  gf: a.gf + g.gf,
  ga: a.ga + g.ga,
  pts: a.pts + (g.res === "W" ? 3 : g.res === "D" ? 1 : 0),
}), { pl:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 });
const scorePredict = (pred, res) => {
  if (pred.sfcG===res.sfcG && pred.oppG===res.oppG) return {pts:3, label:"Exact! ⚽"};
  const pR = pred.sfcG>pred.oppG?"W":pred.sfcG<pred.oppG?"L":"D";
  const rR = res.sfcG>res.oppG?"W":res.sfcG<res.oppG?"L":"D";
  if (pR===rR) return {pts:1, label:"Correct result ✓"};
  return {pts:0, label:"No points"};
};

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Oswald:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background:
      radial-gradient(circle at 50% -10%, #e8ff000a 0%, transparent 55%),
      radial-gradient(circle at 0% 100%, #e8ff0006 0%, transparent 45%),
      #0a0a0f;
    color: #fff;
    font-family: 'Barlow Condensed', sans-serif;
  }
  body::before {
    content:"";
    position:fixed;
    inset:auto 0 0 0;
    height:60vh;
    background: url('/crest-512.jpg') no-repeat center 110%;
    background-size: 78vmin auto;
    opacity:.035;
    pointer-events:none;
    z-index:0;
  }
  @keyframes fadeUp    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes glow      { 0%,100%{box-shadow:0 0 0 0 #e8ff0000} 50%{box-shadow:0 0 22px 5px #e8ff0055} }
  @keyframes pitchIn   { from{opacity:0;transform:scale(.95) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes shake     { 0%,100%{transform:translateX(0)} 30%{transform:translateX(-3px)} 70%{transform:translateX(3px)} }
  @keyframes lockDrop  { 0%{opacity:.3;transform:translateY(-8px)} 100%{opacity:1;transform:translateY(0)} }
  @keyframes awardIn   { 0%{opacity:0;transform:scale(.88) translateY(20px)} 60%{transform:scale(1.03)} 100%{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes trophySpin{ 0%{transform:rotateY(0)} 100%{transform:rotateY(360deg)} }
  @keyframes spin      { to{transform:rotate(360deg)} }
  @keyframes modalIn   { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }
  .slot-spin  { animation: shake .1s infinite; }
  .slot-lock  { animation: lockDrop .3s ease; }
  .pitch-in   { animation: pitchIn .8s cubic-bezier(.22,1,.36,1) both; }
  .award-card { animation: awardIn .6s cubic-bezier(.22,1,.36,1) both; }
  .trophy     { display:inline-block; animation: trophySpin 3s ease-in-out infinite; }
  .loader     { width:36px;height:36px;border:3px solid #ffffff15;border-top-color:#e8ff00;border-radius:50%;animation:spin .8s linear infinite; }
  .btn { border:none;cursor:pointer;font-family:'Oswald',sans-serif;font-weight:700;letter-spacing:2px;text-transform:uppercase;transition:all .18s; }
  .btn-y { background:#e8ff00;color:#0a0a0f;padding:14px 32px;font-size:.95rem; }
  .btn-y:hover { background:#fff;transform:translateY(-2px); }
  .btn-y:disabled { background:#2a2a2a;color:#555;cursor:not-allowed;transform:none; }
  .btn-o { background:transparent;border:1px solid #e8ff00;color:#e8ff00;padding:11px 22px;font-size:.82rem; }
  .btn-o:hover { background:#e8ff0012; }
  .btn-ghost { background:transparent;border:1px solid #ffffff22;color:#ffffff88;padding:7px 14px;font-size:.68rem; }
  .btn-ghost:hover { background:#ffffff0a; }
  .btn-sm { padding:7px 14px;font-size:.72rem; }
  .tab-btn { background:transparent;border:none;cursor:pointer;font-family:'Oswald',sans-serif;font-weight:600;font-size:.68rem;letter-spacing:2px;text-transform:uppercase;padding:8px 12px;color:#ffffff55;border-bottom:2px solid transparent;transition:all .15s;white-space:nowrap; }
  .tab-btn.active { color:#e8ff00;border-bottom-color:#e8ff00; }
  .tab-btn:hover { color:#ffffffcc; }
  .swap-opt { background:#ffffff0c;border:1px solid #ffffff1a;color:#ffffffcc;padding:6px 12px;cursor:pointer;font-family:'Oswald',sans-serif;font-weight:600;font-size:.8rem;letter-spacing:1px;transition:all .15s;display:flex;align-items:center;gap:6px; }
  .swap-opt:hover { background:#e8ff0018;border-color:#e8ff0055;color:#e8ff00; }
  .stat-cell { background:transparent;border:none;color:#ffffffcc;font-family:'Oswald',sans-serif;font-weight:600;font-size:.9rem;text-align:center;width:100%;padding:6px 4px; }
  .stat-cell.editable { cursor:pointer; }
  .stat-cell.editable:hover { background:#e8ff0015;color:#e8ff00; }
  .stat-input { background:#1a1a22;border:1px solid #e8ff00;color:#e8ff00;font-family:'Oswald',sans-serif;font-weight:700;font-size:.9rem;text-align:center;width:100%;padding:5px 2px;outline:none; }
  .pred-row:hover { background:#ffffff08!important; }
  .admin-badge { background:#e8ff00;color:#0a0a0f;font-family:'Oswald',sans-serif;font-size:.55rem;font-weight:800;letter-spacing:2px;padding:2px 7px;border-radius:2px; }
  input:focus,select:focus { outline:2px solid #e8ff0055;outline-offset:-1px; }
  select { background:#0f0f14;border:1px solid #ffffff22;color:#fff;font-family:'Oswald',sans-serif;font-size:.85rem;padding:8px 12px;cursor:pointer; }
  .seg { display:inline-flex;gap:2px;padding:2px;background:#ffffff06;border:1px solid #ffffff1a; }
  .seg button { background:transparent;border:none;cursor:pointer;font-family:'Oswald',sans-serif;font-weight:600;font-size:.64rem;letter-spacing:2px;text-transform:uppercase;color:#ffffff66;padding:6px 12px;transition:all .15s; }
  .seg button.on { background:#e8ff00;color:#0a0a0f; }
  .seg button:not(.on):hover { color:#fff;background:#ffffff0c; }
  .link-btn { background:none;border:none;cursor:pointer;padding:0;font-family:'Oswald',sans-serif;font-size:.6rem;letter-spacing:2px;color:#ffffff55;transition:color .15s; }
  .link-btn:hover { color:#e8ff00; }
  .tap-card { transition:border-color .15s,background .15s; }
  .tap-card:hover { border-color:#e8ff0055!important;background:#e8ff000a!important; }
  @media (max-width:480px) { .hide-sm { display:none; } }
  ::-webkit-scrollbar { width:4px;height:4px; }
  ::-webkit-scrollbar-track { background:#0a0a0f; }
  ::-webkit-scrollbar-thumb { background:#ffffff22;border-radius:2px; }
`;

// ── Shared components ─────────────────────────────────────────────────────────
const ALL_TABS = ["home","squad","report","table","fixtures","stats","predictor","halloffame","season"];
const matchdayScreens = ["setup","spin","pitch"];
const TAB_LABELS = {home:"Home",squad:"⚽ Matchday Squad",report:"Report",season:`${SEASON_2026.label} Review`,stats:"Squad Stats",table:"Table",fixtures:"Results",halloffame:"🏆 Hall",predictor:"Predictor"};

// Every public screen has its own address, so a shared link opens the right
// page and the back button steps through the site. The admin matchday screens
// aren't linkable.
const SCREEN_PATHS = {
  home:"/", squad:"/squad", report:"/report", table:"/table", fixtures:"/results",
  stats:"/stats", predictor:"/predictor", halloffame:"/hall-of-fame", season:`/review-${SEASON_2026.id}`,
};
const SCREEN_TITLES = {
  squad:"Matchday Squad", report:"Match Report", table:"Table", fixtures:"Fixtures & Results",
  stats:"Squad Stats", predictor:"Predictor", halloffame:"Hall of Fame", season:`${SEASON_2026.label} Review`,
};
const screenFromPath = path => {
  const clean = String(path || "/").replace(/\/+$/, "") || "/";
  return Object.keys(SCREEN_PATHS).find(k => SCREEN_PATHS[k] === clean) || "home";
};

function Header({ screen, setScreen, isAdmin, onAdminClick }) {
  const activeTab = matchdayScreens.includes(screen) ? null : screen;
  return (
    <div style={{background:"#0a0a0f",borderBottom:"1px solid #ffffff14",position:"sticky",top:0,zIndex:20}}>
      <div style={{height:50,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div onClick={() => setScreen(isAdmin ? "setup" : "home")} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
          <img src="/crest-512.jpg" alt="Section FC crest" style={{width:36,height:36,objectFit:"contain",filter:"drop-shadow(0 0 8px #e8ff0099) drop-shadow(0 0 3px #e8ff00cc)"}} />
          <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:600,letterSpacing:3,fontSize:".8rem",color:"#ffffffcc"}}>SECTION FC</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {isAdmin && <span className="admin-badge">ADMIN</span>}
          <button className="btn btn-ghost btn-sm" onClick={onAdminClick} style={{borderColor:isAdmin?"#e8ff0055":"#ffffff22",color:isAdmin?"#e8ff00":"#ffffff55"}}>
            {isAdmin ? "⚙ ADMIN" : "🔒 LOGIN"}
          </button>
        </div>
      </div>
      <div style={{display:"flex",borderTop:"1px solid #ffffff08",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        {isAdmin && (
          <button className={`tab-btn${matchdayScreens.includes(screen)?" active":""}`} onClick={() => setScreen("setup")} style={{flexShrink:0}}>
            Matchday
          </button>
        )}
        {ALL_TABS.map(t => (
          <button key={t} className={`tab-btn${activeTab===t?" active":""}`} onClick={() => setScreen(t)} style={{flexShrink:0}}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionHead({ kicker, title }) {
  return (
    <div style={{marginBottom:12}}>
      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",color:"#e8ff00",letterSpacing:4,marginBottom:4}}>{kicker}</div>
      <h2 style={{fontFamily:"'Oswald',sans-serif",fontSize:"clamp(1.2rem,4vw,1.8rem)",fontWeight:700,lineHeight:1,letterSpacing:-.5}}>{title}</h2>
    </div>
  );
}

function Kicker({ children, color="#ffffff40", style }) {
  return <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:4,color,...style}}>{children}</div>;
}

// Live season / closed seasons, for Results and Table.
function SeasonSwitch({ value, onChange }) {
  return (
    <div className="seg" data-share-hide="1">
      {SEASONS.map(s => (
        <button key={s.id} className={value === s.id ? "on" : ""} onClick={() => onChange(s.id)}>{s.label}</button>
      ))}
    </div>
  );
}

function Avatar({ name, size=38, border="#e8ff0055" }) {
  const src = avatar(name);
  if (!src) return (
    <div style={{width:size,height:size,borderRadius:"50%",background:"#ffffff15",border:"1px solid #ffffff20",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:size>30?".75rem":".55rem",color:"#ffffff55",flexShrink:0}}>
      {firstWord(name)[0]}
    </div>
  );
  return <img src={src} alt={name} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:`2px solid ${border}`,flexShrink:0}} />;
}

// The 5-a-side pitch with both line-ups. idPrefix keeps the photo clip-paths
// unique when two pitches are on the page at once (a screen and a share card).
function PitchSVG({ sTeam, oTeam, idPrefix }) {
  const sfcP = sTeam.map((p,i) => ({...p, x:SFC_XY[i][0], y:SFC_XY[i][1], img:avatar(p.name)}));
  const oppP = oTeam.map((p,i) => ({...p, x:OPP_XY[i][0], y:OPP_XY[i][1]}));
  return (
    <svg viewBox={`0 0 ${PW} ${PH}`} style={{width:"100%",display:"block",borderRadius:6}}>
      <defs>
        {sfcP.map((_,i) => <clipPath key={i} id={`${idPrefix}${i}`}><circle cx={ptX(sfcP[i].x)} cy={ptY(sfcP[i].y)} r={17}/></clipPath>)}
      </defs>
      {Array.from({length:16}).map((_,i) => <rect key={i} x={0} y={i*(PH/16)} width={PW} height={PH/16} fill={i%2===0?"#1b6627":"#1e6e2a"}/>)}
      <rect x={10} y={10} width={PW-20} height={PH-20} fill="none" stroke="rgba(255,255,255,.62)" strokeWidth={2}/>
      <line x1={10} y1={PH/2} x2={PW-10} y2={PH/2} stroke="rgba(255,255,255,.5)" strokeWidth={1.5}/>
      <circle cx={PW/2} cy={PH/2} r={36} fill="none" stroke="rgba(255,255,255,.5)" strokeWidth={1.5}/>
      <circle cx={PW/2} cy={PH/2} r={3} fill="rgba(255,255,255,.65)"/>
      <rect x={PW/2-50} y={10} width={100} height={58} fill="none" stroke="rgba(255,255,255,.44)" strokeWidth={1.5}/>
      <rect x={PW/2-25} y={10} width={50} height={26} fill="none" stroke="rgba(255,255,255,.34)" strokeWidth={1}/>
      <circle cx={PW/2} cy={46} r={2.5} fill="rgba(255,255,255,.55)"/>
      <rect x={PW/2-50} y={PH-68} width={100} height={58} fill="none" stroke="rgba(255,255,255,.44)" strokeWidth={1.5}/>
      <rect x={PW/2-25} y={PH-36} width={50} height={26} fill="none" stroke="rgba(255,255,255,.34)" strokeWidth={1}/>
      <circle cx={PW/2} cy={PH-46} r={2.5} fill="rgba(255,255,255,.55)"/>
      <rect x={PW/2-19} y={3} width={38} height={7} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={2}/>
      <rect x={PW/2-19} y={PH-10} width={38} height={7} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={2}/>
      <text x={PW-12} y={PH/2-8}  textAnchor="end" fill="rgba(255,100,68,.4)"  fontSize={6.5} fontFamily="sans-serif" fontWeight="bold">1-1-2-1</text>
      <text x={PW-12} y={PH/2+15} textAnchor="end" fill="rgba(232,255,0,.4)"  fontSize={6.5} fontFamily="sans-serif" fontWeight="bold">1-2-2</text>
      {oppP.map((p,i) => { const cx=ptX(p.x),cy=ptY(p.y); return (<g key={`o${i}`}><circle cx={cx} cy={cy} r={17} fill="#aa1e00" stroke="#ff6644" strokeWidth={2.5}/><text x={cx} y={cy+.5} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={8} fontWeight="bold" fontFamily="sans-serif">{p.pos}</text><rect x={cx-27} y={cy+19} width={54} height={13} rx={2} fill="rgba(0,0,0,.62)"/><text x={cx} y={cy+26} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={7} fontFamily="sans-serif">{lastWord(p.name)}</text></g>); })}
      {sfcP.map((p,i) => { const cx=ptX(p.x),cy=ptY(p.y); return (<g key={`s${i}`}><circle cx={cx} cy={cy} r={17} fill="#9eb400" stroke="#e8ff00" strokeWidth={2.5}/>{p.img?<image href={p.img} x={cx-17} y={cy-17} width={34} height={34} clipPath={`url(#${idPrefix}${i})`} preserveAspectRatio="xMidYMid slice"/>:<text x={cx} y={cy+.5} textAnchor="middle" dominantBaseline="middle" fill="#0a0a0f" fontSize={8} fontWeight="bold" fontFamily="sans-serif">{p.pos}</text>}<rect x={cx-27} y={cy+19} width={54} height={13} rx={2} fill="rgba(0,0,0,.72)"/><text x={cx} y={cy+26} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={7} fontFamily="sans-serif">{firstWord(p.name)}</text></g>); })}
    </svg>
  );
}

// ── Share cards ──────────────────────────────────────────────────────────────
// Clean cards used by `useShareableCard()` for per-player / per-fixture shares.
// Width is fixed so the screenshot has a predictable size on WhatsApp.

function ShareCardFrame({ width=560, children }) {
  return (
    <div style={{width,padding:"22px 22px 18px",background:"#0a0a0f",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",border:"1px solid #e8ff0033",boxSizing:"border-box"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingBottom:10,borderBottom:"1px solid #ffffff14"}}>
        <img src="/crest-512.jpg" alt="" style={{width:34,height:34,objectFit:"contain",filter:"drop-shadow(0 0 6px #e8ff0099)"}} />
        <div>
          <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,letterSpacing:4,fontSize:".85rem",color:"#e8ff00"}}>SECTION FC</div>
          <div style={{fontFamily:"'Oswald',sans-serif",fontStyle:"italic",letterSpacing:2,fontSize:".55rem",color:"#ffffff55"}}>PLAY WITH YOUR HEART ON YOUR SLEEVE</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function PlayerRatingShareCard({ player, opponent, date, sfcScore, oppScore }) {
  const r = player.rating !== "" && player.rating !== undefined ? parseFloat(player.rating) : null;
  const rc = r != null ? getRatingColor(r) : "#ffffff22";
  const score = (sfcScore != null && oppScore != null) ? `${sfcScore}–${oppScore}` : null;
  return (
    <ShareCardFrame>
      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#e8ff0099",marginBottom:6}}>◆ PLAYER RATING</div>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
        <Avatar name={player.name} size={72} border="#e8ff00aa" />
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"1.5rem",letterSpacing:.5,lineHeight:1.1}}>{player.name}</div>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#ffffff66",letterSpacing:2,marginTop:4}}>{player.pos}</div>
          {(opponent || score || date) && (
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#ffffff88",letterSpacing:1,marginTop:6}}>
              {opponent && <span>vs {opponent}</span>}
              {score && <span style={{color:"#ffffffcc",marginLeft:6,fontWeight:700}}>{score}</span>}
              {date && <span style={{marginLeft:6,color:"#ffffff55"}}>· {date}</span>}
            </div>
          )}
        </div>
        {r != null && (
          <div style={{width:88,height:88,borderRadius:8,background:`${rc}22`,border:`3px solid ${rc}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:900,fontSize:"2rem",color:rc,lineHeight:1}}>{r.toFixed(1)}</div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".5rem",letterSpacing:2,color:rc,marginTop:2}}>RATING</div>
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:14,flexWrap:"wrap",fontFamily:"'Oswald',sans-serif",fontSize:".82rem",color:"#ffffffcc",letterSpacing:1}}>
        {player.goals>0    && <div>⚽ {player.goals} GOAL{player.goals>1?"S":""}</div>}
        {player.assists>0  && <div>🅰 {player.assists} ASSIST{player.assists>1?"S":""}</div>}
        {player.yellows>0  && <div style={{color:"#f5c518"}}>🟨 {player.yellows}</div>}
        {player.reds>0     && <div style={{color:"#ff4444"}}>🟥 {player.reds}</div>}
        {player.cleanSheet && <div style={{color:"#44dd88"}}>🧤 CLEAN SHEET</div>}
        {player.motm       && <div style={{color:"#e8ff00",fontWeight:800}}>★ MAN OF THE MATCH</div>}
      </div>
    </ShareCardFrame>
  );
}

function PlayerFormShareCard({ name, games }) {
  const list = (games || []).slice(0, 5);
  const avg = list.length ? (list.reduce((s,g)=>s+parseFloat(g.rating||0),0)/list.length) : 0;
  const avgC = list.length ? getRatingColor(avg) : "#ffffff22";
  return (
    <ShareCardFrame>
      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#e8ff0099",marginBottom:6}}>◆ PLAYER FORM · LAST {list.length || 5}</div>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
        <Avatar name={name} size={64} border="#e8ff00aa" />
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"1.4rem",letterSpacing:.5}}>{name}</div>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".68rem",color:"#ffffff66",letterSpacing:2,marginTop:4}}>FORM AVG · <span style={{color:avgC,fontWeight:700}}>{list.length?avg.toFixed(2):"—"}</span></div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {list.length === 0 && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#ffffff44",letterSpacing:2}}>NO GAMES YET</div>}
        {list.map((g,i) => {
          const c = getRatingColor(parseFloat(g.rating));
          return (
            <div key={i} style={{width:88,height:74,borderRadius:8,background:`${c}1f`,border:`2px solid ${c}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"4px 6px"}}>
              <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"1.25rem",color:c,lineHeight:1}}>{parseFloat(g.rating).toFixed(1)}</div>
              {g.opp && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".5rem",letterSpacing:1,color:"#ffffffaa",marginTop:3,maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.opp}</div>}
              {g.date && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".48rem",letterSpacing:1,color:"#ffffff55",marginTop:1}}>{g.date}</div>}
            </div>
          );
        })}
      </div>
    </ShareCardFrame>
  );
}

function FixtureShareCard({ fixture, label = "NEXT MATCH" }) {
  const sfcHome = isSFC(fixture.home);
  const opp = sfcHome ? fixture.away : fixture.home;
  return (
    <ShareCardFrame width={520}>
      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#e8ff0099",marginBottom:10}}>◆ {label}</div>
      <div style={{textAlign:"center",padding:"12px 0 6px"}}>
        <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"1.6rem",letterSpacing:.5,lineHeight:1.1,marginBottom:8}}>
          <span style={{color:"#e8ff00"}}>SECTION FC</span>
          <span style={{color:"#ffffff30",margin:"0 12px",fontWeight:300}}>vs</span>
          <span style={{color:"#ff6644"}}>{opp === "VACANCY" ? "TBD" : opp}</span>
        </div>
        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".8rem",color:"#ffffffcc",letterSpacing:2,marginTop:6}}>
          {fixture.date} · {fixture.time}
        </div>
        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#ffffff55",letterSpacing:2,marginTop:4}}>
          {fixture.pitch} · {sfcHome ? "HOME" : "AWAY"}
        </div>
      </div>
    </ShareCardFrame>
  );
}

function ResultShareCard({ sfcScore, oppScore, opponent, date, motm }) {
  const won = sfcScore > oppScore;
  const lost = sfcScore < oppScore;
  const tag = won ? {label:"WIN",col:"#44dd88"} : lost ? {label:"LOSS",col:"#ff5544"} : {label:"DRAW",col:"#ffffffcc"};
  return (
    <ShareCardFrame width={520}>
      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#e8ff0099",marginBottom:10}}>◆ LAST RESULT</div>
      <div style={{textAlign:"center"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginBottom:6}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"1.2rem",color:"#e8ff00",letterSpacing:.5}}>SECTION FC</div>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:6}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:900,fontSize:"3.4rem",color:"#fff",lineHeight:1,minWidth:48,textAlign:"right"}}>{sfcScore}</div>
          <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:300,fontSize:"1.6rem",color:"#ffffff30"}}>–</div>
          <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:900,fontSize:"3.4rem",color:"#ff6644",lineHeight:1,minWidth:48,textAlign:"left"}}>{oppScore}</div>
        </div>
        <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"1.05rem",color:"#ff6644",letterSpacing:1}}>{opponent}</div>
        {date && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".68rem",color:"#ffffff55",letterSpacing:2,marginTop:4}}>{date}</div>}
        <div style={{display:"inline-block",marginTop:12,padding:"5px 14px",background:`${tag.col}1c`,border:`1px solid ${tag.col}66`,fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".75rem",letterSpacing:3,color:tag.col}}>{tag.label}</div>
        {motm && (
          <div style={{marginTop:14,padding:"10px 14px",background:"#e8ff000a",border:"1px solid #e8ff0033",display:"flex",alignItems:"center",gap:10}}>
            <Avatar name={motm.name} size={40} border="#e8ff0099" />
            <div style={{flex:1,textAlign:"left"}}>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".5rem",letterSpacing:3,color:"#e8ff0088"}}>★ MAN OF THE MATCH</div>
              <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"1rem"}}>{motm.name}</div>
            </div>
            {motm.rating !== "" && motm.rating != null && (
              <div style={{width:42,height:42,borderRadius:5,background:`${getRatingColor(parseFloat(motm.rating))}22`,border:`2px solid ${getRatingColor(parseFloat(motm.rating))}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".95rem",color:getRatingColor(parseFloat(motm.rating))}}>{parseFloat(motm.rating).toFixed(1)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </ShareCardFrame>
  );
}

function LeaderboardShareCard({ title, subtitle, rows, valueKey = 'pts', valueSuffix = 'pts' }) {
  return (
    <ShareCardFrame>
      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#e8ff0099",marginBottom:6}}>◆ {title}</div>
      {subtitle && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#ffffff88",letterSpacing:1,marginBottom:12}}>{subtitle}</div>}
      <div>
        {rows.slice(0,10).map((row, i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",background:i===0?"#e8ff0010":i%2===0?"transparent":"#ffffff04",borderBottom:"1px solid #ffffff0c"}}>
            <div style={{width:22,fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".95rem",color:i===0?"#e8ff00":i===1?"#aaa":i===2?"#cd7f32":"#ffffff66",textAlign:"center"}}>{i+1}</div>
            <Avatar name={row.name || row.player} size={32} />
            <div style={{flex:1,fontFamily:"'Oswald',sans-serif",fontWeight:i===0?700:500,fontSize:".95rem"}}>{row.name || row.player}</div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"1rem",color:i===0?"#e8ff00":"#fff"}}>{row[valueKey]}<span style={{fontWeight:400,fontSize:".58rem",color:"#ffffff44",marginLeft:3,letterSpacing:1}}>{valueSuffix}</span></div>
          </div>
        ))}
      </div>
    </ShareCardFrame>
  );
}

// WhatsApp crops anything much taller than 4:5 in the chat, so the cards for
// the squad, the report and the fixtures are drawn roughly square instead of
// photographing the (long) page.

function SquadShareCard({ sq, fixture }) {
  const bench = sq.benchTeam || [];
  const where = fixture && [fixture.date, fixture.time, fixture.pitch, isSFC(fixture.home) ? "HOME" : "AWAY"].filter(Boolean).join(" · ");
  return (
    <ShareCardFrame width={600}>
      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#e8ff0099",marginBottom:6}}>◆ MATCHDAY SQUAD</div>
      <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"1.55rem",letterSpacing:.5,lineHeight:1.1}}>
        <span style={{color:"#e8ff00"}}>SECTION FC</span>
        <span style={{color:"#ffffff30",margin:"0 10px",fontWeight:300}}>vs</span>
        <span style={{color:"#ff6644"}}>{sq.oppName}</span>
      </div>
      {where && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".72rem",letterSpacing:2,color:"#ffffffaa",marginTop:6}}>{where.toUpperCase()}</div>}
      <div style={{display:"flex",gap:18,alignItems:"flex-start",marginTop:14}}>
        <div style={{width:262,flexShrink:0}}>
          <PitchSVG sTeam={sq.sTeam} oTeam={sq.oTeam} idPrefix="share-ps" />
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:3,color:"#ffffff55",marginBottom:8}}>STARTING FIVE</div>
          {sq.sTeam.map(p => (
            <div key={p.pos + p.name} style={{display:"flex",alignItems:"center",gap:9,padding:"6px 0",borderBottom:"1px solid #ffffff0c"}}>
              <Avatar name={p.name} size={30} border="#e8ff0066" />
              <div style={{flex:1,minWidth:0,fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".92rem",lineHeight:1.15}}>{p.name}</div>
              <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".55rem",letterSpacing:2,color:"#e8ff00",padding:"2px 6px",border:"1px solid #e8ff0044"}}>{p.pos}</div>
            </div>
          ))}
          {bench.length > 0 && (
            <>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:3,color:"#ffffff55",margin:"14px 0 6px"}}>BENCH</div>
              {bench.map(n => (
                <div key={n} style={{display:"flex",alignItems:"center",gap:9,padding:"4px 0"}}>
                  <Avatar name={n} size={26} border="#ffffff33" />
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:600,fontSize:".85rem",color:"#ffffffcc"}}>{n}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </ShareCardFrame>
  );
}

function ReportShareCard({ r }) {
  const players = (r.players || []).filter(p => p.played !== false);
  const won = r.sfcScore > r.oppScore, lost = r.sfcScore < r.oppScore;
  const tag = won ? {label:"WIN",col:"#44dd88"} : lost ? {label:"LOSS",col:"#ff5544"} : {label:"DRAW",col:"#e8ff00"};
  // The gaffa's opening line, not the whole write-up: the link has the rest.
  const first = String(r.reportText || "").split(/\n\s*\n/)[0].trim();
  const excerpt = first.length > 170 ? first.slice(0, 170).replace(/\s+\S*$/, "") + "…" : first;
  return (
    <ShareCardFrame width={600}>
      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#e8ff0099",marginBottom:8}}>◆ MATCH REPORT · {String(r.date || "").toUpperCase()}</div>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{flex:1,minWidth:0,fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"1.45rem",lineHeight:1.15}}>
          <span style={{color:"#e8ff00"}}>SECTION FC {r.sfcScore}</span>
          <span style={{color:"#ffffff30",margin:"0 8px",fontWeight:300}}>–</span>
          <span style={{color:"#ff6644"}}>{r.oppScore} {r.opponent}</span>
        </div>
        <div style={{flexShrink:0,padding:"4px 12px",background:`${tag.col}1c`,border:`1px solid ${tag.col}66`,fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".7rem",letterSpacing:3,color:tag.col}}>{tag.label}</div>
      </div>
      {excerpt && <div style={{fontSize:".98rem",fontStyle:"italic",color:"#ffffffbb",lineHeight:1.45,margin:"10px 0 4px"}}>“{excerpt}”</div>}
      {players.length > 0 && (
        <div style={{marginTop:10}}>
          {players.map(p => {
            const rating = p.rating !== "" && p.rating != null ? parseFloat(p.rating) : null;
            const rc = rating != null ? getRatingColor(rating) : "#ffffff22";
            return (
              <div key={p.name} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0",borderBottom:"1px solid #ffffff0c"}}>
                <Avatar name={p.name} size={28} border={p.motm ? "#e8ff00" : "#ffffff33"} />
                <div style={{flex:1,minWidth:0,fontFamily:"'Oswald',sans-serif",fontWeight:p.motm ? 800 : 600,fontSize:".9rem"}}>{p.name}</div>
                <div style={{display:"flex",gap:8,alignItems:"center",fontFamily:"'Oswald',sans-serif",fontSize:".72rem",color:"#ffffffcc"}}>
                  {p.goals > 0   && <span>⚽ {p.goals}</span>}
                  {p.assists > 0 && <span>🅰 {p.assists}</span>}
                  {p.motm        && <span style={{color:"#e8ff00",fontWeight:800,letterSpacing:1}}>★ MOTM</span>}
                </div>
                {rating != null && (
                  <div style={{width:38,height:28,borderRadius:4,background:`${rc}22`,border:`2px solid ${rc}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".8rem",color:rc,flexShrink:0}}>{rating.toFixed(1)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ShareCardFrame>
  );
}

function FixturesShareCard({ fixtures, season }) {
  return (
    <ShareCardFrame width={600}>
      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#e8ff0099",marginBottom:10}}>◆ OUR FIXTURES · {season.label.toUpperCase()} · {season.division.toUpperCase()}</div>
      {fixtures.map(f => {
        const home = isSFC(f.home);
        return (
          <div key={f.date + f.time} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:"1px solid #ffffff0c",fontFamily:"'Oswald',sans-serif"}}>
            <div style={{width:92,flexShrink:0,fontWeight:700,fontSize:".85rem",color:"#e8ff00",letterSpacing:.5}}>{f.date.replace(/\s+\d{4}$/, "")}</div>
            <div style={{width:58,flexShrink:0,fontSize:".78rem",color:"#ffffffaa"}}>{f.time}</div>
            <div style={{flex:1,minWidth:0,fontWeight:600,fontSize:".95rem"}}>
              <span style={{display:"inline-block",width:22,color:"#ffffff55"}}>{home ? "v" : "@"}</span>{home ? f.away : f.home}
            </div>
            <div style={{flexShrink:0,fontSize:".62rem",letterSpacing:1.5,color:"#ffffff66"}}>{f.pitch ? f.pitch.toUpperCase() : ""}</div>
          </div>
        );
      })}
    </ShareCardFrame>
  );
}

// ── Admin PIN Modal ───────────────────────────────────────────────────────────
function AdminModal({ isAdmin, onClose, onLogin, onLogout }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const tryLogin = () => {
    if (pin === ADMIN_PIN) { onLogin(); onClose(); }
    else { setError("Wrong PIN — try again"); setPin(""); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}>
      <div style={{background:"#111116",border:"1px solid #ffffff18",padding:"28px 24px",maxWidth:340,width:"100%",animation:"modalIn .25s ease"}}>
        {isAdmin ? (
          <>
            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"1.2rem",marginBottom:8}}>Admin Mode Active</div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".75rem",color:"#ffffff55",letterSpacing:1,marginBottom:20}}>You have full edit access</div>
            <button className="btn btn-o" onClick={() => { onLogout(); onClose(); }} style={{width:"100%",marginBottom:10}}>LOG OUT OF ADMIN</button>
            <button className="btn btn-ghost" onClick={onClose} style={{width:"100%"}}>CANCEL</button>
          </>
        ) : (
          <>
            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"1.2rem",marginBottom:4}}>Admin Login</div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".72rem",color:"#ffffff44",letterSpacing:1,marginBottom:20}}>Enter PIN to access admin features</div>
            <input
              type="password"
              value={pin}
              onChange={e => { setPin(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && tryLogin()}
              placeholder="Enter PIN…"
              autoFocus
              style={{width:"100%",padding:"13px 14px",background:"#ffffff0d",border:"1px solid #ffffff1e",color:"#fff",fontFamily:"'Oswald',sans-serif",fontSize:"1.1rem",letterSpacing:4,marginBottom:8,textAlign:"center"}}
            />
            {error && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".72rem",color:"#ff5555",letterSpacing:1,marginBottom:8,textAlign:"center"}}>{error}</div>}
            <button className="btn btn-y" onClick={tryLogin} style={{width:"100%",padding:"13px",marginBottom:8}}>LOGIN</button>
            <button className="btn btn-ghost" onClick={onClose} style={{width:"100%"}}>CANCEL</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  // Auth
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  // Navigation
  const [screen, setScreen] = useState(() => screenFromPath(window.location.pathname));
  const [viewSeason, setViewSeason] = useState(SEASON.id); // Results / Table season switch
  const [loading, setLoading] = useState(true);

  // Squad / Matchday (admin only)
  const [squad,        setSquad]        = useState([...KNOWN_PLAYERS]);
  const [pIn,          setPIn]          = useState("");
  const [oIn,          setOIn]          = useState("");
  const [oppName,      setOppName]      = useState("");
  const [sTeam,        setSTeam]        = useState([]);
  const [oTeam,        setOTeam]        = useState([]);
  const [benchTeam,    setBenchTeam]    = useState([]);

  // Published matchday squad (synced with Firestore)
  const [matchdaySquad, setMatchdaySquad] = useState(null);

  // Match report (synced with Firestore + local draft state)
  const [matchReport,  setMatchReport]  = useState(null);
  const [reportDraft,  setReportDraft]  = useState(null);
  // Guards against a second apply: the ref blocks a double-click within the same
  // tick (state updates too late for that), the flag drives the button.
  const [applying,     setApplying]     = useState(false);
  const applyingRef                     = useRef(false);

  // Stats (synced with Firestore)
  const [stats,        setStats]        = useState(initStats());
  const [sortStat,     setSortStat]     = useState("apps");
  const [editCell,     setEditCell]     = useState(null);
  const [statsTab,     setStatsTab]     = useState("season"); // "season"|"alltime"|"form"
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting,    setResetting]    = useState(false);
  const [allTimeStats, setAllTimeStats] = useState(initStats());
  const [playerFormData, setPlayerFormData] = useState({});
  const [editFormCell, setEditFormCell] = useState(null);
  const [addingFormGame, setAddingFormGame] = useState(null);
  const [newGameInput,   setNewGameInput]   = useState({rating:"",opp:"",date:""});

  // Hall of Fame (synced with Firestore)
  const [awardWinners,  setAwardWinners]  = useState({});
  const [editingAwards, setEditingAwards] = useState(false);
  const [activeAward,   setActiveAward]   = useState(0);

  // Predictor (synced with Firestore)
  const [predSetup,     setPredSetup]     = useState(false);
  const [predMatch,     setPredMatch]     = useState({opp:"",date:"",home:"",away:""});
  const [predictions,   setPredictions]   = useState([]);
  const [predResult,    setPredResult]    = useState(null);
  const [seasonPreds,   setSeasonPreds]   = useState([]);
  const [predName,          setPredName]          = useState("");
  const [predSFC,           setPredSFC]           = useState("");
  const [predOpp,           setPredOpp]           = useState("");
  const [predFirstScorer,   setPredFirstScorer]   = useState(""); // legacy "yes"|"no"|""
  const [predMotmPick,      setPredMotmPick]      = useState(""); // player name
  const [predOverUnder,     setPredOverUnder]     = useState(""); // "over"|"under"|""
  const [predCleanSheet,    setPredCleanSheet]    = useState(""); // "yes"|"no"|""
  const [predHTLeader,      setPredHTLeader]      = useState(""); // "sfc"|"opp"|"draw"|""
  const [predAnytimeScorer, setPredAnytimeScorer] = useState(""); // player name
  const [resultSFC,         setResultSFC]         = useState("");
  const [resultOpp,         setResultOpp]         = useState("");
  const [resultFirstScorer, setResultFirstScorer] = useState(""); // legacy "yes"|"no"|""
  const [resultMotm,        setResultMotm]        = useState(""); // player name
  const [resultOverUnder,     setResultOverUnder]     = useState("");
  const [resultCleanSheet,    setResultCleanSheet]    = useState("");
  const [resultHTLeader,      setResultHTLeader]      = useState("");
  const [resultAnytimeScorer, setResultAnytimeScorer] = useState("");
  const [propResult,        setPropResult]        = useState(null);

  // Dashboard
  const [clockTick, setClockTick] = useState(0);  // bumped every minute to refresh countdown

  // Report archive
  const [reportArchive,   setReportArchive]   = useState([]);
  const [expandedArchive, setExpandedArchive] = useState(null);
  const [scrollToReport,  setScrollToReport]  = useState(null); // archive id to bring into view

  // Share — off-screen card renderer + per-screen capture refs.
  const shareCard          = useShareableCard();
  const refHomeLastResult  = useRef(null);
  const refHomeNextMatch   = useRef(null);
  const refHallOfFame      = useRef(null);
  const refStatsTable      = useRef(null);
  const refPlayerForm      = useRef(null);
  const refPredictorBoard  = useRef(null);
  const refTable           = useRef(null);
  const refSeason          = useRef(null);

  // ── Firebase listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsubs = [];

    // Stats
    unsubs.push(onSnapshot(collection(db, "stats"), snap => {
      const data = initStats();
      snap.forEach(d => { if (data[d.id]) data[d.id] = { ...data[d.id], ...d.data() }; });
      setStats(data);
      setLoading(false);
    }));

    // Awards
    unsubs.push(onSnapshot(doc(db, "awards", "current"), snap => {
      if (snap.exists()) setAwardWinners(snap.data());
    }));

    // Predictor
    unsubs.push(onSnapshot(doc(db, "predictor", "current"), snap => {
      if (snap.exists()) {
        const d = snap.data();
        setPredSetup(d.active || false);
        setPredMatch({ opp: d.opp||"", date: d.date||"", home: d.home||"", away: d.away||"", propPlayer: d.propPlayer||"", goalsLine: d.goalsLine ?? null });
        setPredictions(d.predictions || []);
        setPredResult(d.result || null);
        setPropResult(d.propResult || null);
      }
    }));

    // Season leaderboard
    unsubs.push(onSnapshot(doc(db, "season", "leaderboard"), snap => {
      if (snap.exists()) setSeasonPreds(snap.data().entries || []);
    }));

    // All Time Stats
    unsubs.push(onSnapshot(collection(db, "allTimeStats"), snap => {
      const data = initStats();
      snap.forEach(d => { if (data[d.id]) data[d.id] = { ...data[d.id], ...d.data() }; });
      setAllTimeStats(data);
    }));

    // Player Form
    unsubs.push(onSnapshot(collection(db, "playerForm"), snap => {
      const data = {};
      snap.forEach(d => { data[d.id] = d.data(); });
      setPlayerFormData(data);
    }));

    // Published matchday squad
    unsubs.push(onSnapshot(doc(db, "matchday", "squad"), snap => {
      setMatchdaySquad(snap.exists() && snap.data().published ? snap.data() : null);
    }));

    // Match report
    unsubs.push(onSnapshot(doc(db, "matchday", "report"), snap => {
      const data = snap.exists() ? snap.data() : null;
      setMatchReport(data);
      if (data && !data.applied) {
        setReportDraft(prev => prev ?? data);
      }
    }));

    // Report archive
    unsubs.push(onSnapshot(collection(db, "reportArchive"), snap => {
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      items.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
      setReportArchive(items);
    }));

    return () => unsubs.forEach(u => u());
  }, []);

  // Keep the address bar on the screen being shown, so a link can be copied
  // and the back button steps through the site. The first sync replaces the
  // entry rather than adding one, which also tidies an unknown address.
  const firstSync = useRef(true);
  useEffect(() => {
    const path = SCREEN_PATHS[screen];
    if (path && window.location.pathname !== path) {
      window.history[firstSync.current ? "replaceState" : "pushState"](null, "", path);
    }
    firstSync.current = false;
    document.title = SCREEN_TITLES[screen] ? `${SCREEN_TITLES[screen]} · Section FC` : "Section FC · Play With Your Heart On Your Sleeve";
  }, [screen]);
  useEffect(() => {
    const onBack = () => setScreen(screenFromPath(window.location.pathname));
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);

  // Opening a report from the Results page lands on that report, not the top.
  useEffect(() => {
    if (screen !== "report" || !scrollToReport) return;
    const el = document.getElementById(`report-${scrollToReport}`);
    if (!el) return; // archive still loading; runs again when it arrives
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setScrollToReport(null);
  }, [screen, scrollToReport, reportArchive]);

  // Clock: tick every minute so the countdown stays live
  useEffect(() => {
    const iv = setInterval(() => setClockTick(t => t + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const addPlayer = () => {
    const n = pIn.trim();
    if (!n || squad.includes(n) || squad.length >= 20) return;
    setSquad(s => [...s, n]);
    setPIn("");
  };

  const goPick = async () => {
    if (squad.length < 5 || !oIn.trim()) return;
    const name = oIn.trim().toUpperCase();
    setOppName(name);
    let opp = buildOpp();
    try {
      const slug = oppSlug(name);
      if (slug) {
        const snap = await getDoc(doc(db, "oppositionTeams", slug));
        if (snap.exists()) opp = mergeOppRoster(snap.data().players);
      }
    } catch {/* fall back to random */}
    setOTeam(opp);
    setSTeam(SFC_POS.map(pos => ({ name: "", pos })));
    setBenchTeam([]);
    setScreen("spin");
  };

  const setStarter = (i, name) => {
    setSTeam(prev => prev.map((t, j) => j !== i ? (t.name === name ? {...t, name:""} : t) : {...t, name}));
    if (name) setBenchTeam(prev => prev.filter(n => n !== name));
  };

  // ── Firestore writes (admin only) ──────────────────────────────────────────
  const updateStat = async (player, key, val) => {
    const n = Math.max(0, parseInt(val) || 0);
    setStats(prev => ({ ...prev, [player]: { ...prev[player], [key]: n } }));
    await setDoc(doc(db, "stats", player), { ...stats[player], [key]: n });
  };

  const publishSquad = async () => {
    const oTrimmed = oTeam.map(p => ({ name: (p.name||"").trim(), pos: p.pos }));
    const oFilled = mergeOppRoster(oTrimmed);
    const data = {
      published: true,
      oppName,
      sTeam,
      oTeam: oFilled,
      benchTeam,
      publishedAt: Date.now(),
    };
    await setDoc(doc(db, "matchday", "squad"), data);
    const slug = oppSlug(oppName);
    if (slug) {
      await setDoc(doc(db, "oppositionTeams", slug), {
        oppName,
        players: oTrimmed,
        updatedAt: Date.now(),
      });
    }
    // Reset the post-match report so the new matchday starts with empty
    // stat inputs instead of inheriting the previous game's "applied" state.
    await deleteDoc(doc(db, "matchday", "report"));
    setReportDraft(null);
  };

  const clearSquad = async () => {
    await setDoc(doc(db, "matchday", "squad"), { published: false });
  };

  // ── Match Report helpers ───────────────────────────────────────────────────
  const blankReportPlayer = (name, pos) => ({
    name, pos, played: true,
    goals: 0, assists: 0, yellows: 0, reds: 0,
    cleanSheet: false, motm: false, rating: "",
  });

  const startReportFromSquad = () => {
    if (!matchdaySquad) return;
    const players = [
      ...matchdaySquad.sTeam.map(p => blankReportPlayer(p.name, p.pos)),
      ...(matchdaySquad.benchTeam || []).map(n => blankReportPlayer(n, "SUB")),
    ];
    const draft = {
      opponent: matchdaySquad.oppName || "",
      date: new Date().toLocaleDateString("en-GB", {weekday:"short",day:"numeric",month:"short",year:"numeric"}),
      sfcScore: "", oppScore: "", reportText: "", players, applied: false,
      squadId: matchdaySquad.publishedAt || null,
    };
    setReportDraft(draft);
    setDoc(doc(db, "matchday", "report"), draft);
  };

  const updateReportPlayer = (i, field, value) => {
    setReportDraft(d => {
      const players = [...d.players];
      // MOTM is exclusive — clear others first
      if (field === "motm" && value) players.forEach((p,j) => { if (j!==i) players[j]={...p,motm:false}; });
      players[i] = { ...players[i], [field]: value };
      return { ...d, players };
    });
  };

  const saveReportDraft = async () => {
    if (!reportDraft) return;
    await setDoc(doc(db, "matchday", "report"), { ...reportDraft, applied: false });
  };

  const saveCorrection = async () => {
    if (!reportDraft) return;
    const corrected = { ...reportDraft, applied: true };
    await setDoc(doc(db, "matchday", "report"), corrected);
    // Also fix the matching form entry
    const formSnap = await getDoc(doc(db, "team", "form"));
    const existing = formSnap.exists() ? (formSnap.data().results || []) : [];
    const idx = existing.findIndex(e => e.opp === corrected.opponent);
    if (idx !== -1) {
      existing[idx] = { sfcScore: parseInt(corrected.sfcScore), oppScore: parseInt(corrected.oppScore), opp: corrected.opponent, date: corrected.date };
      await setDoc(doc(db, "team", "form"), { results: existing });
    }
    setReportDraft(null);
  };

  const applyReport = async () => {
    if (!reportDraft || reportDraft.applied || applyingRef.current) return;
    applyingRef.current = true;
    setApplying(true);
    try {
      await applyReportOnce();
    } finally {
      applyingRef.current = false;
      setApplying(false);
    }
  };

  const applyReportOnce = async () => {
    // A match already in team/form had its stats applied on an earlier press.
    // Re-applying would double every player's apps, goals and ratings.
    const guardSnap = await getDoc(doc(db, "team", "form"));
    const guardResults = guardSnap.exists() ? (guardSnap.data().results || []) : [];
    if (guardResults.some(r => r.opp === reportDraft.opponent && r.date === reportDraft.date)) {
      window.alert(
        `${reportDraft.opponent} on ${reportDraft.date} has already been added to the stats.\n\n` +
        `Nothing was added a second time. To change the score or the write-up, ` +
        `use SAVE CORRECTION instead.`
      );
      await setDoc(doc(db, "matchday", "report"), { ...reportDraft, applied: true });
      setReportDraft(null);
      return;
    }
    for (const p of reportDraft.players) {
      if (!p.played) continue;
      const upd = {
        apps:        increment(1),
        goals:       increment(parseInt(p.goals)  || 0),
        assists:     increment(parseInt(p.assists) || 0),
        yellows:     increment(parseInt(p.yellows) || 0),
        reds:        increment(parseInt(p.reds)    || 0),
        cleanSheets: increment(p.cleanSheet ? 1 : 0),
        motm:        increment(p.motm        ? 1 : 0),
      };
      await setDoc(doc(db, "stats",        p.name), upd, { merge: true });
      await setDoc(doc(db, "allTimeStats", p.name), upd, { merge: true });
      // Add rating to player form (keep last 5)
      const formSnap = await getDoc(doc(db, "playerForm", p.name));
      const existing = formSnap.exists() ? (formSnap.data().games || []) : [];
      const r = parseFloat(p.rating);
      if (!isNaN(r)) {
        const newGames = [...existing, { rating: r, opp: reportDraft.opponent, date: reportDraft.date }].slice(-5);
        await setDoc(doc(db, "playerForm", p.name), { games: newGames });
      }
    }
    const final = { ...reportDraft, sfcScore: parseInt(reportDraft.sfcScore)||0, oppScore: parseInt(reportDraft.oppScore)||0, applied: true, publishedAt: Date.now(), squadId: reportDraft.squadId ?? matchdaySquad?.publishedAt ?? null };
    await setDoc(doc(db, "matchday", "report"), final);
    setReportDraft(final);

    // Append result to team form history (keeps last 10)
    const formSnap2 = await getDoc(doc(db, "team", "form"));
    const existingForm = formSnap2.exists() ? (formSnap2.data().results || []) : [];
    const newResult = { sfcScore: final.sfcScore, oppScore: final.oppScore, opp: final.opponent, date: final.date };
    await setDoc(doc(db, "team", "form"), { results: [...existingForm, newResult].slice(-10) });

    // Save to report archive
    await setDoc(doc(db, "reportArchive", `report_${final.publishedAt}`), final);
  };

  const updateAllTimeStat = async (player, key, val) => {
    const n = Math.max(0, parseInt(val) || 0);
    setAllTimeStats(prev => ({ ...prev, [player]: { ...prev[player], [key]: n } }));
    await setDoc(doc(db, "allTimeStats", player), { ...allTimeStats[player], [key]: n });
  };

  const updateFormRating = async (player, idx, field, value) => {
    const current = playerFormData[player]?.games || [];
    const updated = [...current];
    if (!updated[idx]) updated[idx] = { rating: 0, opp: "", date: "" };
    updated[idx] = { ...updated[idx], [field]: field === "rating" ? Math.min(10, Math.max(0, parseFloat(value) || 0)) : value };
    setPlayerFormData(prev => ({ ...prev, [player]: { games: updated } }));
    await setDoc(doc(db, "playerForm", player), { games: updated });
  };

  const deleteFormGame = async (player, idx) => {
    const current = playerFormData[player]?.games || [];
    const updated = current.filter((_, i) => i !== idx);
    setPlayerFormData(prev => ({ ...prev, [player]: { games: updated } }));
    await setDoc(doc(db, "playerForm", player), { games: updated });
  };

  const addFormGame = async (player, rating, opp, date) => {
    const r = Math.min(10, Math.max(0, parseFloat(rating) || 0));
    if (!rating.toString().trim()) return;
    const current = playerFormData[player]?.games || [];
    const newGame = { rating: r, opp: opp.trim(), date: date.trim() };
    const updated = [...current, newGame].slice(-5);
    setPlayerFormData(prev => ({ ...prev, [player]: { games: updated } }));
    await setDoc(doc(db, "playerForm", player), { games: updated });
    setAddingFormGame(null);
    setNewGameInput({ rating: "", opp: "", date: "" });
  };

  const saveAward = async (awardId, winner) => {
    const next = { ...awardWinners, [awardId]: winner || null };
    setAwardWinners(next);
    await setDoc(doc(db, "awards", "current"), next);
  };

  const setupPredMatch = async (m) => {
    const data = { active: true, opp: m.opp, date: m.date, home: m.home, away: m.away, predictions: [], result: null, goalsLine: 6.5, propPlayer: "", propResult: null };
    await setDoc(doc(db, "predictor", "current"), data);
  };

  const submitPrediction = async () => {
    if (!predName.trim() || predSFC === "" || predOpp === "") return;
    const pred = {
      player: predName.trim(),
      sfcG: parseInt(predSFC),
      oppG: parseInt(predOpp),
      firstScorer: predFirstScorer,
      motmPick: predMotmPick,
      overUnder: predOverUnder,
      cleanSheet: predCleanSheet,
      htLeader: predHTLeader,
      anytimeScorer: predAnytimeScorer,
      submitted: Date.now(),
    };
    const newPreds = [...predictions.filter(p => p.player !== pred.player), pred];
    await updateDoc(doc(db, "predictor", "current"), { predictions: newPreds });
    setPredName(""); setPredSFC(""); setPredOpp("");
    setPredFirstScorer(""); setPredMotmPick("");
    setPredOverUnder(""); setPredCleanSheet(""); setPredHTLeader(""); setPredAnytimeScorer("");
  };

  const revealResult = async () => {
    const r = { sfcG: parseInt(resultSFC), oppG: parseInt(resultOpp) };
    const anyProp =
      resultFirstScorer !== "" || resultMotm !== "" ||
      resultOverUnder !== "" || resultCleanSheet !== "" ||
      resultHTLeader !== ""   || resultAnytimeScorer !== "";
    const pr = anyProp ? {
      firstScorer:   resultFirstScorer === "" ? null : resultFirstScorer === "yes",
      motm:          resultMotm,
      overUnder:     resultOverUnder,
      cleanSheet:    resultCleanSheet === "" ? null : resultCleanSheet === "yes",
      htLeader:      resultHTLeader,
      anytimeScorer: resultAnytimeScorer,
    } : null;
    const map = {};
    predictions.forEach(pred => {
      const { pts } = scorePredict(pred, r);
      let total = pts;
      if (pr) {
        if (pr.firstScorer !== null && pred.firstScorer)   total += ((pred.firstScorer === "yes") === pr.firstScorer) ? 1 : 0;
        if (pr.motm && pred.motmPick)                       total += (pred.motmPick === pr.motm) ? 1 : 0;
        if (pr.overUnder && pred.overUnder)                 total += (pred.overUnder === pr.overUnder) ? 1 : 0;
        if (pr.cleanSheet !== null && pred.cleanSheet)      total += ((pred.cleanSheet === "yes") === pr.cleanSheet) ? 1 : 0;
        if (pr.htLeader && pred.htLeader)                   total += (pred.htLeader === pr.htLeader) ? 1 : 0;
        if (pr.anytimeScorer && pred.anytimeScorer)         total += (pred.anytimeScorer === pr.anytimeScorer) ? 1 : 0;
      }
      if (!map[pred.player]) map[pred.player] = { pts: 0, games: 0 };
      map[pred.player].pts += total;
      map[pred.player].games += 1;
    });
    seasonPreds.forEach(p => {
      if (!map[p.player]) map[p.player] = { pts: p.pts, games: p.games };
      else { map[p.player].pts += p.pts; map[p.player].games += p.games; }
    });
    const newSeason = Object.entries(map).map(([player, d]) => ({ player, ...d })).sort((a,b) => b.pts - a.pts);
    await updateDoc(doc(db, "predictor", "current"), { result: r, ...(pr ? { propResult: pr } : {}) });
    await setDoc(doc(db, "season", "leaderboard"), { entries: newSeason });
    setResultSFC(""); setResultOpp("");
    setResultFirstScorer(""); setResultMotm("");
    setResultOverUnder(""); setResultCleanSheet(""); setResultHTLeader(""); setResultAnytimeScorer("");
  };

  const resetPredictor = async () => {
    await setDoc(doc(db, "predictor", "current"), { active: false, opp: "", date: "", home: "", away: "", predictions: [], result: null, propPlayer: "", goalsLine: null, propResult: null });
    setPredFirstScorer(""); setPredMotmPick("");
    setPredOverUnder(""); setPredCleanSheet(""); setPredHTLeader(""); setPredAnytimeScorer("");
    setResultFirstScorer(""); setResultMotm("");
    setResultOverUnder(""); setResultCleanSheet(""); setResultHTLeader(""); setResultAnytimeScorer("");
  };

  // Wipe everything tied to a single season. Keeps allTimeStats, reportArchive
  // and Hall of Fame so previous seasons remain queryable.
  const resetSeason = async () => {
    const players = [...new Set([...KNOWN_PLAYERS, ...Object.keys(stats), ...Object.keys(playerFormData)])];
    const zeros = { apps:0, goals:0, assists:0, yellows:0, reds:0, cleanSheets:0, motm:0 };
    for (const p of players) {
      await setDoc(doc(db, "stats", p), zeros);
    }
    for (const p of Object.keys(playerFormData)) {
      await deleteDoc(doc(db, "playerForm", p));
    }
    await setDoc(doc(db, "team",     "form"),        { results: [] });
    await setDoc(doc(db, "season",   "leaderboard"), { entries: [] });
    await setDoc(doc(db, "matchday", "report"),      {});
    await setDoc(doc(db, "matchday", "squad"),       { published: false });
    await setDoc(doc(db, "predictor","current"),     { active: false, opp: "", date: "", home: "", away: "", predictions: [], result: null, propPlayer: "", goalsLine: null, propResult: null });
  };

  // ── Dashboard helpers ────────────────────────────────────────────────────────
  // Built from its parts in local time: handing "5 Oct 2026 19:10" to the
  // Date parser works in some browsers and not others.
  const parseMatchDateTime = (dateStr, timeStr) => {
    const d = String(dateStr || "").match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
    const t = String(timeStr || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    const mon = d && MONTHS[d[2].toLowerCase()];
    if (!d || !t || mon == null) return new Date(NaN);
    let h = +t[1];
    const period = (t[3] || "").toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return new Date(+d[3], mon, +d[1], h, +t[2]);
  };

  const getCountdown = (match) => {
    const diff = parseMatchDateTime(match.date, match.time) - new Date();
    if (!(diff > 0)) return null; // also covers a date that wouldn't parse
    return {
      days:  Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins:  Math.floor((diff % 3600000)  / 60000),
      diff,
    };
  };

  const getFormText = (results) => {
    if (results.length < 2) return '';
    const rev = [...results].reverse();
    const lossAt   = rev.findIndex(r => r.sfcScore <  r.oppScore);
    const nonWinAt = rev.findIndex(r => r.sfcScore <= r.oppScore);
    const nonLossAt= rev.findIndex(r => r.sfcScore >= r.oppScore);
    if (lossAt   === -1 && results.length >= 3) return 'Unbeaten all season';
    if (lossAt   >=  4) return `Unbeaten in ${lossAt}`;
    if (lossAt   >=  2) return `Unbeaten in ${lossAt}`;
    if (nonWinAt >=  3) return `Won last ${nonWinAt}`;
    if (nonWinAt >=  2) return 'Back-to-back wins';
    if (nonLossAt >= 3) return `${nonLossAt} without a win`;
    if (nonLossAt >= 2) return 'Back-to-back defeats';
    return '';
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const findReport = (date, opp) => {
    const day = dayOf(date), key = teamKey(opp);
    if (day == null) return null;
    return reportArchive.find(r => teamKey(r.opponent) === key && Math.abs((dayOf(r.date) ?? Infinity) - day) <= 2) || null;
  };
  const sfcFixtures = FIXTURES.flatMap(gw => gw.matches.filter(m => isSFC(m.home)||isSFC(m.away)).map(m => ({...m, date:gw.date})));
  const squadFixture = sq => {
    const key = teamKey(sq.oppName);
    const posted = sq.publishedAt ? Math.floor(sq.publishedAt / 86400000) : -Infinity;
    return sfcFixtures.find(m => teamKey(isSFC(m.home) ? m.away : m.home) === key && (dayOf(m.date) ?? -Infinity) >= posted) || null;
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <style>{CSS}</style>
      <div className="loader" />
      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".75rem",color:"#ffffff40",letterSpacing:3}}>LOADING SECTION FC HUB</div>
    </div>
  );

  const sharedProps = { screen, setScreen, isAdmin, onAdminClick: () => setShowPinModal(true) };

  // ══════════════════════════════════════════════════════════════════════════
  // HOME / DASHBOARD SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "home") {
    void clockTick; // reference so countdown re-renders every minute

    // ── Data derivations ───────────────────────────────────────────────────
    const nextMatch  = sfcFixtures.find(m => getCountdown(m) !== null);
    const countdown  = nextMatch ? getCountdown(nextMatch) : null;
    const isMatchDay = countdown && countdown.diff < 24 * 60 * 60 * 1000;

    // The live report, or failing that the newest one in the archive — posting
    // the next squad clears matchday/report, and the last result shouldn't
    // vanish off the home page on matchday because of it.
    const lastResult = matchReport?.applied ? matchReport : (reportArchive[0] || null);
    const motmPlayer = lastResult?.players?.find(p => p.motm && p.played !== false);
    const resultType = lastResult
      ? (lastResult.sfcScore > lastResult.oppScore ? 'W' : lastResult.sfcScore < lastResult.oppScore ? 'L' : 'D')
      : null;
    const scorers = (lastResult?.players || [])
      .filter(p => p.played !== false && (parseInt(p.goals) || 0) > 0)
      .sort((a, b) => b.goals - a.goals);

    const sfcRow     = LEAGUE_TABLE.find(t => isSFC(t.team));
    const sfcIdx     = LEAGUE_TABLE.indexOf(sfcRow);
    // The whole division fits on the card; a bigger one gets five rows around us.
    const winStart   = Math.max(0, Math.min(sfcIdx - 2, LEAGUE_TABLE.length - 5));
    const tableRows  = LEAGUE_TABLE.length <= 8 || sfcIdx < 0 ? LEAGUE_TABLE : LEAGUE_TABLE.slice(winStart, winStart + 5);
    const levelWith  = sfcRow ? LEAGUE_TABLE.filter(t => t !== sfcRow && t.pos === sfcRow.pos) : [];
    const ptsOffTop  = sfcRow ? LEAGUE_TABLE[0].pts - sfcRow.pts : 0;

    // Form comes from this season's results, so it always matches the table.
    const run        = seasonRun(PAST_RESULTS);
    const last5Form  = run.slice(-5);
    const formText   = getFormText(run.map(g => ({ sfcScore: g.gf, oppScore: g.ga })));

    const topScorers = KNOWN_PLAYERS
      .filter(p => (stats[p]?.goals || 0) > 0)
      .sort((a, b) => stats[b].goals - stats[a].goals || (stats[b].motm || 0) - (stats[a].motm || 0) || a.localeCompare(b))
      .slice(0, 3);

    const lastSeason    = ARCHIVE[0];
    const lastSeasonRow = lastSeason && tableFor(lastSeason).find(t => isSFC(t.team));

    const resultColor = { W:'#44dd88', D:'#e8ff00', L:'#ff4444' };
    const card = { background:"#ffffff06", border:"1px solid #ffffff14", padding:"18px 20px" };
    const gdText = n => n > 0 ? `+${n}` : `${n}`;

    return (
      <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
        <style>{CSS}</style>
        <Header {...sharedProps} />
        <main style={{padding:"16px 14px",maxWidth:640,margin:"0 auto",display:"flex",flexDirection:"column",gap:12}}>

          {/* ── MASTHEAD ── */}
          <div style={{position:"relative",overflow:"hidden",border:"1px solid #e8ff0026",background:"#0a0a0f",animation:"fadeUp .4s ease both"}}>
            <div aria-hidden="true" style={{position:"absolute",inset:0,background:"url('/stadium.jpg') center 35% / cover no-repeat",opacity:.85}} />
            <div aria-hidden="true" style={{position:"absolute",inset:0,background:"linear-gradient(180deg, #0a0a0f00 0%, #0a0a0f8c 48%, #0a0a0f 100%)"}} />
            <div style={{position:"relative",padding:"30px 18px 16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
                <img src="/crest-512.jpg" alt="Section FC crest" style={{width:62,height:62,objectFit:"contain",mixBlendMode:"lighten",flexShrink:0}} />
                <div style={{minWidth:0}}>
                  <Kicker color="#e8ff00" style={{fontSize:".55rem",marginBottom:5}}>◆ {SEASON.label.toUpperCase()} · {SEASON.division.toUpperCase()}</Kicker>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(1.8rem,8.5vw,2.5rem)",letterSpacing:3,lineHeight:1}}>SECTION FC</div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontStyle:"italic",fontSize:".55rem",letterSpacing:2.5,color:"#ffffff80",marginTop:7}}>PLAY WITH YOUR HEART ON YOUR SLEEVE</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderTop:"1px solid #ffffff1c",paddingTop:13}}>
                {[
                  ["POSITION",  sfcRow ? `${levelWith.length ? "=" : ""}${ordinal(sfcRow.pos).toUpperCase()}` : "—"],
                  ["POINTS",    sfcRow ? sfcRow.pts : "—"],
                  ["PLAYED",    sfcRow ? sfcRow.pl  : 0],
                  ["GOAL DIFF", sfcRow ? gdText(sfcRow.gd) : "—"],
                ].map(([k, v], i) => (
                  <div key={k} style={{textAlign:"center",borderLeft:i ? "1px solid #ffffff12" : "none",padding:"0 4px"}}>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(1.25rem,5.8vw,1.7rem)",lineHeight:1.05,color:i === 0 ? "#e8ff00" : "#fff"}}>{v}</div>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".5rem",letterSpacing:2,color:"#ffffff60",marginTop:5}}>{k}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── NEXT MATCH ── */}
          <div ref={refHomeNextMatch} style={{...card, background: isMatchDay ? "#e8ff0010" : card.background, border:`1px solid ${isMatchDay?"#e8ff0044":"#ffffff14"}`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,gap:8}}>
              <Kicker>{isMatchDay ? "⚡ MATCHDAY" : "◆ NEXT MATCH"}</Kicker>
              {nextMatch && (
                <ShareButton
                  variant="icon"
                  onShare={() => shareCard.share(
                    <FixtureShareCard fixture={nextMatch} label={isMatchDay?"MATCHDAY":"NEXT MATCH"} />,
                    {
                      filename:"section-fc-next-match.png",
                      caption:`Next up: SECTION FC ${isSFC(nextMatch.home)?"vs":"@"} ${isSFC(nextMatch.home)?nextMatch.away:nextMatch.home} — ${nextMatch.date} ${nextMatch.time}`,
                      urlPath:SCREEN_PATHS.fixtures,
                    }
                  )}
                />
              )}
            </div>
            {nextMatch ? (
              <>
                {/* Countdown */}
                {countdown && (
                  <div style={{display:"flex",gap:10,alignItems:"flex-end",marginBottom:14}}>
                    {countdown.days > 0 && (
                      <div style={{textAlign:"center"}}>
                        <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(2.4rem,8vw,3.6rem)",lineHeight:1,color:"#e8ff00"}}>{countdown.days}</div>
                        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:3,color:"#ffffff50"}}>DAY{countdown.days!==1?"S":""}</div>
                      </div>
                    )}
                    {(countdown.days > 0 || countdown.hours > 0) && (
                      <>
                        {countdown.days > 0 && <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:300,fontSize:"2rem",color:"#ffffff20",lineHeight:1,marginBottom:6}}>:</div>}
                        <div style={{textAlign:"center"}}>
                          <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(2.4rem,8vw,3.6rem)",lineHeight:1,color:isMatchDay?"#e8ff00":"#fff"}}>{countdown.hours}</div>
                          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:3,color:"#ffffff50"}}>HR{countdown.hours!==1?"S":""}</div>
                        </div>
                      </>
                    )}
                    <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:300,fontSize:"2rem",color:"#ffffff20",lineHeight:1,marginBottom:6}}>:</div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(2.4rem,8vw,3.6rem)",lineHeight:1,color:isMatchDay?"#e8ff00":"#fff"}}>{countdown.mins}</div>
                      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:3,color:"#ffffff50"}}>MIN{countdown.mins!==1?"S":""}</div>
                    </div>
                  </div>
                )}
                {/* Match info */}
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(1rem,3.5vw,1.3rem)",lineHeight:1.1}}>
                      {isSFC(nextMatch.home) ? `vs ${nextMatch.away}` : `@ ${nextMatch.home}`}
                    </div>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#ffffff60",marginTop:4,letterSpacing:.5}}>
                      {[nextMatch.date, nextMatch.time, nextMatch.pitch].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".6rem",letterSpacing:2,padding:"4px 10px",border:`1px solid ${isSFC(nextMatch.home)?"#e8ff0066":"#ffffff33"}`,color:isSFC(nextMatch.home)?"#e8ff00":"#ffffffaa"}}>
                    {isSFC(nextMatch.home) ? "HOME" : "AWAY"}
                  </div>
                </div>
                {/* Matchday: squad alert */}
                {isMatchDay && (
                  <div style={{marginTop:12,padding:"8px 12px",background: matchdaySquad?"#44dd8814":"#ffffff08",border:`1px solid ${matchdaySquad?"#44dd8844":"#ffffff14"}`}}>
                    <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".65rem",letterSpacing:2,color:matchdaySquad?"#44dd88":"#ffffff44"}}>
                      {matchdaySquad ? "✓ SQUAD POSTED" : "⏳ SQUAD NOT YET POSTED"}
                    </span>
                    {matchdaySquad && (
                      <button onClick={() => setScreen("squad")} style={{background:"none",border:"none",color:"#44dd88",fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:1,cursor:"pointer",marginLeft:10,textDecoration:"underline"}}>VIEW →</button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div>
                <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(1.15rem,4.5vw,1.4rem)",letterSpacing:1,color:"#ffffffcc",lineHeight:1.1}}>
                  {FIXTURES.length ? "NO MORE FIXTURES" : "FIXTURE TBC"}
                </div>
                <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:2,color:"#ffffff45",marginTop:7,lineHeight:1.6}}>
                  {FIXTURES.length ? "THAT'S THE LOT FOR THIS SEASON" : "MONDAY NIGHTS · IT GOES UP AS SOON AS THE LEAGUE PUBLISHES IT"}
                </div>
              </div>
            )}
          </div>

          {/* ── LAST RESULT ── */}
          {lastResult ? (
            <div ref={refHomeLastResult} style={card}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,gap:8}}>
                <Kicker>◆ LAST RESULT</Kicker>
                <ShareButton
                  variant="icon"
                  onShare={() => shareCard.share(
                    <ResultShareCard sfcScore={lastResult.sfcScore} oppScore={lastResult.oppScore} opponent={lastResult.opponent} date={lastResult.date} motm={motmPlayer} />,
                    {
                      filename:"section-fc-result.png",
                      caption:`SECTION FC ${lastResult.sfcScore}–${lastResult.oppScore} ${lastResult.opponent}${motmPlayer?` · MOTM: ${motmPlayer.name}`:""}`,
                      urlPath:SCREEN_PATHS.report,
                    }
                  )}
                />
              </div>
              {/* Scoreboard */}
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                {[
                  { name:"SECTION FC",         score:lastResult.sfcScore, sfc:true  },
                  { name:lastResult.opponent,  score:lastResult.oppScore, sfc:false },
                ].map(t => (
                  <div key={t.sfc ? "sfc" : "opp"} style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:3,height:26,background:t.sfc ? "#e8ff00" : "#ff6644",flexShrink:0}} />
                    <div style={{flex:1,minWidth:0,fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(1.05rem,4.6vw,1.3rem)",letterSpacing:.5,color:t.sfc ? "#fff" : "#ffffffcc",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.name}</div>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"clamp(1.7rem,7.5vw,2.2rem)",lineHeight:1,minWidth:36,textAlign:"right",color:t.sfc ? "#e8ff00" : "#fff"}}>{t.score}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:14}}>
                <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".62rem",letterSpacing:2,padding:"4px 10px",background:`${resultColor[resultType]}18`,border:`1px solid ${resultColor[resultType]}55`,color:resultColor[resultType]}}>
                  {resultType === 'W' ? '✓ WIN' : resultType === 'L' ? '✗ LOSS' : '= DRAW'}
                </div>
                <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:2,color:"#ffffff50"}}>{String(lastResult.date || "").toUpperCase()}</div>
              </div>
              {/* Scorers */}
              {scorers.length > 0 && (
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                  {scorers.map(p => (
                    <div key={p.name} style={{display:"flex",alignItems:"center",gap:7,padding:"3px 11px 3px 3px",background:"#ffffff08",border:"1px solid #ffffff14",borderRadius:20}}>
                      <Avatar name={p.name} size={24} border="#ffffff33" />
                      <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:600,fontSize:".78rem",letterSpacing:.3}}>{p.name}</span>
                      <span style={{fontSize:".7rem",letterSpacing:-1}}>{p.goals <= 3 ? "⚽".repeat(p.goals) : `⚽×${p.goals}`}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* MOTM */}
              {motmPlayer && (
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#e8ff0008",border:"1px solid #e8ff0020",marginBottom:12}}>
                  <Avatar name={motmPlayer.name} size={34} border="#e8ff0055" />
                  <div>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".52rem",letterSpacing:3,color:"#e8ff0088",marginBottom:1}}>★ MAN OF THE MATCH</div>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".95rem"}}>{motmPlayer.name}</div>
                  </div>
                  {motmPlayer.rating !== "" && motmPlayer.rating !== undefined && (
                    <div style={{marginLeft:"auto",width:38,height:38,borderRadius:5,background:`${getRatingColor(parseFloat(motmPlayer.rating))}22`,border:`2px solid ${getRatingColor(parseFloat(motmPlayer.rating))}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".88rem",color:getRatingColor(parseFloat(motmPlayer.rating))}}>{parseFloat(motmPlayer.rating).toFixed(1)}</span>
                    </div>
                  )}
                </div>
              )}
              {/* Report teaser */}
              {lastResult.reportText && (
                <div style={{fontSize:".95rem",color:"#ffffffaa",lineHeight:1.5,marginBottom:10}}>
                  {lastResult.reportText.length > 140 ? lastResult.reportText.slice(0,140).replace(/\s+\S*$/, "") + '…' : lastResult.reportText}
                </div>
              )}
              <button className="link-btn" onClick={() => setScreen("report")}>READ FULL REPORT →</button>
            </div>
          ) : (
            <div style={{...card, background:"#ffffff04", border:"1px solid #ffffff0a"}}>
              <Kicker color="#ffffff25" style={{marginBottom:6}}>◆ LAST RESULT</Kicker>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".75rem",color:"#ffffff25",letterSpacing:2}}>NO RESULT YET THIS SEASON</div>
            </div>
          )}

          {/* ── TABLE + FORM ── */}
          <div style={card}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,gap:8}}>
              <Kicker>◆ {SEASON.division.toUpperCase()} TABLE</Kicker>
              <button className="link-btn" onClick={() => setScreen("table")}>FULL TABLE →</button>
            </div>
            {tableRows.length > 0 ? (
              <>
                <div style={{display:"grid",gridTemplateColumns:"30px 1fr 24px 36px 34px",alignItems:"center",padding:"0 8px 6px",fontFamily:"'Oswald',sans-serif",fontSize:".52rem",letterSpacing:2,color:"#ffffff35"}}>
                  <div>#</div><div>TEAM</div><div style={{textAlign:"center"}}>P</div><div style={{textAlign:"center"}}>GD</div><div style={{textAlign:"right"}}>PTS</div>
                </div>
                {tableRows.map(row => {
                  const us = isSFC(row.team);
                  return (
                    <div key={row.team} style={{display:"grid",gridTemplateColumns:"30px 1fr 24px 36px 34px",alignItems:"center",padding:"7px 8px",background:us ? "#e8ff0010" : "transparent",borderLeft:`2px solid ${us ? "#e8ff00" : "transparent"}`,fontFamily:"'Oswald',sans-serif"}}>
                      <div style={{fontWeight:700,fontSize:".75rem",color:us ? "#e8ff00" : "#ffffff55"}}>{posLabel(row, LEAGUE_TABLE)}</div>
                      <div style={{fontWeight:us ? 700 : 400,fontSize:us ? ".92rem" : ".86rem",color:us ? "#fff" : "#ffffffaa",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{row.team}</div>
                      <div style={{textAlign:"center",fontSize:".78rem",color:"#ffffff70"}}>{row.pl}</div>
                      <div style={{textAlign:"center",fontSize:".78rem",color:row.gd > 0 ? "#44dd88" : row.gd < 0 ? "#ff6644" : "#ffffff70"}}>{gdText(row.gd)}</div>
                      <div style={{textAlign:"right",fontWeight:700,fontSize:".88rem",color:us ? "#e8ff00" : "#fff"}}>{row.pts}</div>
                    </div>
                  );
                })}
                {sfcRow && (
                  <div style={{marginTop:9,padding:"0 8px",fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:2,color:"#ffffff45",lineHeight:1.6}}>
                    {ptsOffTop === 0 && !levelWith.length
                      ? "TOP OF THE TABLE"
                      : ptsOffTop === 0 ? "JOINT TOP" : `${ptsOffTop} PT${ptsOffTop !== 1 ? "S" : ""} OFF TOP`}
                    {levelWith.length > 0 && ` · LEVEL WITH ${levelWith.map(t => t.team.toUpperCase()).join(" & ")}`}
                  </div>
                )}
              </>
            ) : (
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".72rem",color:"#ffffff30",letterSpacing:2}}>NO GAMES PLAYED YET</div>
            )}

            {/* Form */}
            <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid #ffffff0c",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <Kicker style={{letterSpacing:3}}>FORM</Kicker>
              <div style={{display:"flex",gap:5}}>
                {last5Form.map((g, i) => (
                  <div key={i} title={`${g.date} — ${g.home ? "v" : "@"} ${g.opp} ${g.gf}-${g.ga}`}
                    style={{width:30,height:30,borderRadius:4,background:`${resultColor[g.res]}18`,border:`2px solid ${resultColor[g.res]}66`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".75rem",color:resultColor[g.res]}}>{g.res}</span>
                  </div>
                ))}
                {Array.from({length: Math.max(0, 5 - last5Form.length)}).map((_, i) => (
                  <div key={`e${i}`} style={{width:30,height:30,borderRadius:4,background:"#ffffff05",border:"1px dashed #ffffff15"}} />
                ))}
              </div>
              {formText && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:2,color:"#ffffff55"}}>{formText.toUpperCase()}</div>}
            </div>
          </div>

          {/* ── TOP SCORERS ── */}
          {topScorers.length > 0 && (
            <div style={card}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,gap:8}}>
                <Kicker>◆ TOP SCORERS · {SEASON.label.toUpperCase()}</Kicker>
                <button className="link-btn" onClick={() => setScreen("stats")}>ALL STATS →</button>
              </div>
              {topScorers.map((p, i) => (
                <div key={p} style={{display:"flex",alignItems:"center",gap:11,padding:"7px 0",borderBottom:i < topScorers.length - 1 ? "1px solid #ffffff08" : "none"}}>
                  <div style={{width:14,fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".75rem",color:i === 0 ? "#e8ff00" : "#ffffff45"}}>{i + 1}</div>
                  <Avatar name={p} size={32} border={i === 0 ? "#e8ff0088" : "#ffffff22"} />
                  <div style={{flex:1,minWidth:0,fontFamily:"'Oswald',sans-serif",fontWeight:i === 0 ? 700 : 500,fontSize:".92rem"}}>{p}</div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"1.05rem",color:i === 0 ? "#e8ff00" : "#fff"}}>
                    {stats[p].goals}<span style={{fontWeight:400,fontSize:".52rem",letterSpacing:1,color:"#ffffff40",marginLeft:3}}>GLS</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── THE DUGOUT ── */}
          <div style={card}>
            <Kicker style={{marginBottom:6}}>◆ THE DUGOUT</Kicker>
            {STAFF.map(s => (
              <div key={s.role} style={{display:"flex",alignItems:"center",gap:13,padding:"9px 0"}}>
                <Avatar name={s.name} size={48} border="#e8ff0088" />
                <div style={{minWidth:0}}>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".52rem",letterSpacing:3,color:"#e8ff00",marginBottom:2}}>{s.role.toUpperCase()}</div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"1.05rem",lineHeight:1.15}}>{s.name}</div>
                  {s.note && <div style={{fontSize:".88rem",color:"#ffffff80",lineHeight:1.35,marginTop:2}}>{s.note}</div>}
                </div>
              </div>
            ))}
            {INJURED.length > 0 && (
              <div style={{marginTop:8,paddingTop:12,borderTop:"1px solid #ffffff0c",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <Kicker color="#ff8866" style={{letterSpacing:3}}>INJURY LIST</Kicker>
                {INJURED.map(n => (
                  <div key={n} style={{display:"flex",alignItems:"center",gap:7,padding:"3px 11px 3px 3px",background:"#ff88660d",border:"1px solid #ff886633",borderRadius:20}}>
                    <Avatar name={n} size={24} border="#ff886666" />
                    <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:600,fontSize:".78rem"}}>{n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── PREDICTION TEASER ── */}
          {(predSetup || (predResult && predictions.length > 0)) && (
            <div style={card}>
              <Kicker style={{marginBottom:10}}>◆ PREDICTOR</Kicker>
              {predSetup && !predResult ? (
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                  <div>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"1rem"}}>vs {predMatch.opp}</div>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".65rem",color:"#ffffff50",letterSpacing:1}}>Predictions open · {predictions.length} submitted</div>
                  </div>
                  <button onClick={() => setScreen("predictor")} style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".65rem",letterSpacing:2,padding:"7px 14px",background:"#e8ff0010",border:"1px solid #e8ff0044",color:"#e8ff00",cursor:"pointer"}}>
                    PREDICT →
                  </button>
                </div>
              ) : predResult && seasonPreds.length > 0 && (
                <div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".65rem",color:"#ffffff50",letterSpacing:1,marginBottom:8}}>LEADERBOARD — TOP 3</div>
                  {seasonPreds.slice(0,3).map((p,i) => (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0",borderBottom:"1px solid #ffffff08"}}>
                      <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".75rem",color:i===0?"#e8ff00":"#ffffff55",width:16}}>{i+1}</div>
                      <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:i===0?700:400,fontSize:".85rem",flex:1}}>{p.player}</div>
                      <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".8rem",color:"#e8ff00"}}>{p.pts}<span style={{fontFamily:"'Oswald',sans-serif",fontWeight:400,fontSize:".55rem",color:"#ffffff40",marginLeft:2}}>PTS</span></div>
                    </div>
                  ))}
                  <button className="link-btn" onClick={() => setScreen("predictor")} style={{marginTop:8}}>SEE FULL LEADERBOARD →</button>
                </div>
              )}
            </div>
          )}

          {/* ── LAST SEASON ── */}
          {lastSeason && lastSeasonRow && (
            <button className="tap-card" onClick={() => setScreen("season")}
                    style={{...card,textAlign:"left",width:"100%",cursor:"pointer",color:"#fff",fontFamily:"inherit",background:"radial-gradient(ellipse at 0% 0%, #44dd880f, transparent 70%)"}}>
              <Kicker style={{marginBottom:8}}>◆ LAST SEASON · {lastSeason.label.toUpperCase()} · {lastSeason.division.toUpperCase()}</Kicker>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:6}}>
                <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"clamp(1.05rem,4.4vw,1.35rem)",letterSpacing:-.3,lineHeight:1.1}}>{lastSeason.review.title}</div>
                <div style={{flexShrink:0,fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".62rem",letterSpacing:2,padding:"4px 10px",background:"#44dd8814",border:"1px solid #44dd8855",color:"#44dd88"}}>{lastSeason.review.verdict}</div>
              </div>
              <div style={{fontSize:".92rem",color:"#ffffff99",lineHeight:1.45,marginBottom:10}}>
                {ordinal(lastSeasonRow.pos)}, {lastSeasonRow.pts} points. {lastSeason.review.standfirst}
              </div>
              <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:2,color:"#e8ff00"}}>READ THE {lastSeason.label.toUpperCase()} REVIEW →</span>
            </button>
          )}

          {/* ── CLUB FOOTER ── */}
          <div style={{marginTop:12,padding:"20px 16px 24px",borderTop:"1px solid #ffffff0c",display:"flex",flexDirection:"column",alignItems:"center",gap:10,textAlign:"center"}}>
            <img src="/crest-512.jpg" alt="Section FC" style={{width:72,height:72,opacity:1,filter:"drop-shadow(0 0 14px #e8ff0088) drop-shadow(0 0 4px #e8ff00bb)"}} />
            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,letterSpacing:6,fontSize:".85rem",color:"#e8ff00"}}>SECTION FC</div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontStyle:"italic",letterSpacing:3,fontSize:".62rem",color:"#ffffff55"}}>PLAY WITH YOUR HEART ON YOUR SLEEVE</div>
          </div>

        </main>
        {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
        {shareCard.portal}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STATS SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "stats") {
    const StatCell = ({ player, statKey, data, updateFn }) => {
      const canEdit = isAdmin && !!updateFn;
      const isEdit = canEdit && editCell?.player === player && editCell?.stat === statKey;
      const val = data[player]?.[statKey] ?? 0;
      const color = statKey==="yellows"&&val>0?"#f5c518":statKey==="reds"&&val>0?"#ff4444":statKey==="motm"&&val>0?"#e8ff00":"inherit";
      if (isEdit) return (
        <td style={{textAlign:"center",padding:"3px 2px"}}>
          <input className="stat-input" type="number" min="0" defaultValue={val} autoFocus
            onBlur={e => { updateFn(player, statKey, e.target.value); setEditCell(null); }}
            onKeyDown={e => { if (e.key==="Enter"||e.key==="Escape") { updateFn(player, statKey, e.target.value); setEditCell(null); } }}
          />
        </td>
      );
      return (
        <td style={{textAlign:"center",padding:"3px 2px"}}>
          <button className={`stat-cell${canEdit?" editable":""}`} onClick={() => canEdit && setEditCell({player, stat:statKey})}>
            <span style={{color}}>{val}</span>
          </button>
        </td>
      );
    };

    const StatsTable = ({ data, updateFn, captureRef }) => {
      const allP = [...new Set([...KNOWN_PLAYERS, ...squad])].filter(p => data[p]);
      const sorted = [...allP].sort(byStat(data, sortStat));
      return (
        <div ref={captureRef} style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:580}}>
            <thead>
              <tr style={{borderBottom:"2px solid #e8ff00"}}>
                <th style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:2,color:"#ffffff55",fontWeight:600,padding:"9px 10px",textAlign:"left",width:150}}>PLAYER</th>
                {STAT_KEYS.map(k => (
                  <th key={k} onClick={() => setSortStat(k)} style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:1.5,color:sortStat===k?"#e8ff00":"#ffffff55",fontWeight:700,padding:"9px 5px",textAlign:"center",cursor:"pointer",transition:"color .15s",whiteSpace:"nowrap"}}>
                    {STAT_LABELS[k]}{sortStat===k?" ↓":""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((player, ri) => (
                <tr key={player} style={{borderBottom:"1px solid #ffffff08",background:ri%2===0?"transparent":"#ffffff03"}}>
                  <td style={{padding:"9px 10px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <Avatar name={player} size={32} />
                      <div>
                        <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".88rem"}}>{player}</div>
                        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",color:"#ffffff38",letterSpacing:1,whiteSpace:"nowrap"}}>
                          #{ri+1}
                          {playerTag(player) && <span style={{marginLeft:6,color:playerTag(player).color,letterSpacing:1.5}}>· {playerTag(player).label}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  {STAT_KEYS.map(k => <StatCell key={k} player={player} statKey={k} data={data} updateFn={updateFn} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    const PlayerFormView = () => {
      const playersWithForm = KNOWN_PLAYERS.filter(p => isAdmin || (playerFormData[p]?.games?.length > 0));
      return (
        <div>
          {isAdmin && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".56rem",letterSpacing:3,color:"#ffffff35",marginBottom:12}}>CLICK + TO ADD GAME · CLICK RATING TO EDIT</div>}
          <div ref={refPlayerForm} style={{display:"flex",flexDirection:"column",gap:2}}>
            {playersWithForm.map((player, pi) => {
              const games = playerFormData[player]?.games || [];
              const isAdding = addingFormGame === player;
              return (
                <div key={player} style={{background:pi%2===0?"transparent":"#ffffff03",borderBottom:"1px solid #ffffff08",padding:"10px 8px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                    <div style={{display:"flex",alignItems:"center",gap:9,minWidth:155,flexShrink:0}}>
                      <Avatar name={player} size={36} />
                      <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".88rem",flex:1}}>{player}</div>
                      {games.length > 0 && (
                        <ShareButton
                          variant="icon"
                          size={26}
                          onShare={() => shareCard.share(
                            <PlayerFormShareCard name={player} games={games} />,
                            { filename:`section-fc-${firstWord(player).toLowerCase()}-form.png`, caption:`${player} — recent form`, urlPath:SCREEN_PATHS.stats }
                          )}
                        />
                      )}
                    </div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1,alignItems:"center"}}>
                      {Array.from({length:5}).map((_,gi) => {
                        const game = games[gi];
                        const isEditingThis = editFormCell?.player===player && editFormCell?.idx===gi;
                        if (isEditingThis) return (
                          <input key={gi} type="number" min="0" max="10" step="0.1" autoFocus
                            defaultValue={game?.rating ?? ""}
                            style={{width:44,height:44,background:"#1a1a22",border:"1px solid #e8ff00",color:"#e8ff00",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".85rem",textAlign:"center",borderRadius:6,padding:0,outline:"none"}}
                            onBlur={e => { updateFormRating(player, gi, "rating", e.target.value); setEditFormCell(null); }}
                            onKeyDown={e => { if(e.key==="Enter"||e.key==="Escape"){ updateFormRating(player, gi, "rating", e.target.value); setEditFormCell(null); } }}
                          />
                        );
                        if (!game) return (
                          <div key={gi} style={{width:44,height:44,borderRadius:6,background:"#ffffff05",border:"1px dashed #ffffff15",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <span style={{color:"#ffffff15",fontSize:".7rem"}}>–</span>
                          </div>
                        );
                        const c = getRatingColor(game.rating);
                        return (
                          <div key={gi} style={{position:"relative",flexShrink:0}}>
                            <div onClick={() => isAdmin && setEditFormCell({player,idx:gi})}
                              style={{width:44,height:44,borderRadius:6,background:`${c}22`,border:`2px solid ${c}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",cursor:isAdmin?"pointer":"default",transition:"opacity .15s"}}>
                              <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".88rem",color:c,lineHeight:1}}>{parseFloat(game.rating).toFixed(1)}</span>
                              {game.opp && <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".38rem",color:"#ffffffaa",lineHeight:1.3,maxWidth:40,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{game.opp}</span>}
                            </div>
                            {isAdmin && <button onClick={() => deleteFormGame(player, gi)}
                              style={{position:"absolute",top:-5,right:-5,width:14,height:14,borderRadius:"50%",background:"#ff4444",border:"none",color:"#fff",fontSize:".45rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,lineHeight:1}}>✕</button>}
                          </div>
                        );
                      })}
                      {isAdmin && games.length < 5 && !isAdding && (
                        <button onClick={() => { setAddingFormGame(player); setNewGameInput({rating:"",opp:"",date:""}); }}
                          style={{width:44,height:44,borderRadius:6,background:"#e8ff0010",border:"1px dashed #e8ff0044",color:"#e8ff0088",fontSize:"1.4rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:300,flexShrink:0,lineHeight:1}}>+</button>
                      )}
                    </div>
                  </div>
                  {isAdmin && isAdding && (
                    <div style={{marginTop:8,padding:"10px 12px",background:"#ffffff08",border:"1px solid #e8ff0033",borderRadius:4}}>
                      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:3,color:"#e8ff0077",marginBottom:8}}>ADD GAME FOR {player.split(" ")[0].toUpperCase()}</div>
                      <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
                        <input id={`fg-r-${pi}`} type="number" min="0" max="10" step="0.1" placeholder="Rating" defaultValue={newGameInput.rating}
                          style={{width:68,padding:"7px 6px",background:"#0f0f14",border:"1px solid #e8ff0044",color:"#e8ff00",fontFamily:"'Oswald',sans-serif",fontSize:".9rem",textAlign:"center"}} />
                        <input id={`fg-o-${pi}`} type="text" placeholder="Opponent (opt)" defaultValue={newGameInput.opp}
                          style={{flex:1,minWidth:100,padding:"7px 10px",background:"#0f0f14",border:"1px solid #ffffff1e",color:"#fff",fontFamily:"'Oswald',sans-serif",fontSize:".82rem"}} />
                        <input id={`fg-d-${pi}`} type="text" placeholder="Date (opt)" defaultValue={newGameInput.date}
                          style={{width:80,padding:"7px 8px",background:"#0f0f14",border:"1px solid #ffffff1e",color:"#fff",fontFamily:"'Oswald',sans-serif",fontSize:".82rem"}} />
                        <button className="btn btn-y btn-sm" onClick={() => {
                          const r=document.getElementById(`fg-r-${pi}`)?.value;
                          const o=document.getElementById(`fg-o-${pi}`)?.value||"";
                          const dt=document.getElementById(`fg-d-${pi}`)?.value||"";
                          addFormGame(player,r,o,dt);
                        }}>ADD</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setAddingFormGame(null); setNewGameInput({rating:"",opp:"",date:""}); }}>✕</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {playersWithForm.length === 0 && (
              <div style={{padding:"36px",textAlign:"center",color:"#ffffff30",fontFamily:"'Oswald',sans-serif",fontSize:".8rem",letterSpacing:2}}>NO FORM DATA YET</div>
            )}
          </div>
          <div style={{marginTop:18,padding:"12px 14px",background:"#ffffff05",border:"1px solid #ffffff0e"}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:3,color:"#ffffff44",marginBottom:9}}>RATING SCALE</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {[["1.0–4.5","#ff3333"],["4.6–5.5","#ff8800"],["5.6–6.5","#e8d060"],["6.6–7.5","#cc8800"],["7.6–8.7","#55dd66"],["8.8–9.8","#22aa44"],["9.9–10","#00d4ff"]].map(([label,color]) => (
                <div key={label} style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:10,height:10,borderRadius:2,background:color,flexShrink:0}} />
                  <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#ffffffaa"}}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
        <style>{CSS}</style>
        <Header {...sharedProps} />
        <main style={{padding:"22px 14px",maxWidth:900,margin:"0 auto"}}>
          <div style={{marginBottom:16}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#e8ff00",letterSpacing:4,marginBottom:5}}>◆ PLAYER STATISTICS</div>
            <h1 style={{fontFamily:"'Oswald',sans-serif",fontSize:"clamp(1.6rem,5vw,2.8rem)",fontWeight:700,lineHeight:1}}>SECTION FC STATS</h1>
          </div>
          {/* Sub-tabs */}
          <div style={{display:"flex",borderBottom:"1px solid #ffffff14",marginBottom:18,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            {[["season",SEASON.label],["alltime","All Time"],["form","Form"],...ARCHIVE.map(a => [a.id, a.label])].map(([key,label]) => (
              <button key={key} onClick={() => { setStatsTab(key); setEditCell(null); setEditFormCell(null); setAddingFormGame(null); }}
                style={{background:"transparent",border:"none",borderBottom:`2px solid ${statsTab===key?"#e8ff00":"transparent"}`,flexShrink:0,
                  color:statsTab===key?"#e8ff00":"#ffffff55",padding:"10px 13px",cursor:"pointer",marginBottom:-1,
                  fontFamily:"'Oswald',sans-serif",fontWeight:600,fontSize:".68rem",letterSpacing:2,
                  textTransform:"uppercase",transition:"all .15s",whiteSpace:"nowrap"}}
              >{label}</button>
            ))}
          </div>
          {statsTab === "season" && (
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:9,flexWrap:"wrap"}}>
                {isAdmin
                  ? <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".56rem",letterSpacing:3,color:"#ffffff35"}}>CLICK ANY STAT TO EDIT · CLICK HEADER TO SORT</div>
                  : <span />}
                <ShareButton
                  label="SHARE TABLE"
                  onShare={() => {
                    const allP = [...new Set([...KNOWN_PLAYERS, ...squad])].filter(p => stats[p]);
                    const sorted = [...allP].sort(byStat(stats, sortStat));
                    const rows = sorted.map(p => ({ name: p, [sortStat]: stats[p][sortStat]||0 }));
                    return shareCard.share(
                      <LeaderboardShareCard title={`${SEASON.label.toUpperCase()} SEASON · TOP ${STAT_LABELS[sortStat]}`} subtitle="Section FC" rows={rows} valueKey={sortStat} valueSuffix="" />,
                      { filename:"section-fc-season-leaders.png", caption:`Section FC — ${SEASON.label} season ${STAT_LABELS[sortStat]} leaders`, urlPath:SCREEN_PATHS.stats }
                    );
                  }}
                />
              </div>
              <StatsTable data={stats} updateFn={updateStat} captureRef={refStatsTable} />
              {isAdmin && (
                <div style={{marginTop:24,paddingTop:18,borderTop:"1px solid #ffffff10"}}>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:3,color:"#ff666688",marginBottom:8}}>◆ DANGER ZONE</div>
                  {!resetConfirm ? (
                    <button className="btn btn-ghost" onClick={() => setResetConfirm(true)} style={{borderColor:"#ff444455",color:"#ff8888"}}>↺ RESET SEASON STATS</button>
                  ) : (
                    <div style={{background:"#ff44440a",border:"1px solid #ff444433",padding:"14px 16px"}}>
                      <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".82rem",color:"#ff8888",marginBottom:6}}>⚠ Reset season — are you sure?</div>
                      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".66rem",letterSpacing:1,color:"#ffffff70",lineHeight:1.55,marginBottom:12}}>
                        This zeros every player&apos;s season stats and clears player form, team form, the predictor leaderboard, the active match report and the published squad. <strong style={{color:"#ffffffaa"}}>All-time stats, the report archive and Hall of Fame winners are kept.</strong>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button className="btn btn-y" disabled={resetting} onClick={async () => { setResetting(true); await resetSeason(); setResetting(false); setResetConfirm(false); }} style={{background:"#ff4444",color:"#fff",padding:"10px 18px",fontSize:".75rem"}}>
                          {resetting ? "RESETTING…" : "✓ YES, RESET"}
                        </button>
                        <button className="btn btn-ghost" disabled={resetting} onClick={() => setResetConfirm(false)}>CANCEL</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {statsTab === "alltime" && (
            <>
              {isAdmin && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".56rem",letterSpacing:3,color:"#ffffff35",marginBottom:9}}>CLICK ANY STAT TO EDIT · CLICK HEADER TO SORT</div>}
              <StatsTable data={allTimeStats} updateFn={updateAllTimeStat} />
            </>
          )}
          {statsTab === "form" && <PlayerFormView />}
          {ARCHIVE.filter(a => statsTab === a.id).map(a => (
            <div key={a.id}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:9,flexWrap:"wrap"}}>
                <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".56rem",letterSpacing:3,color:"#ffffff45"}}>FINAL {a.label.toUpperCase()} TOTALS · {a.division.toUpperCase()} · CLICK HEADER TO SORT</div>
                <ShareButton
                  label="SHARE TABLE"
                  onShare={() => {
                    const rows = Object.keys(a.stats)
                      .sort(byStat(a.stats, sortStat))
                      .map(n => ({ name: n, [sortStat]: a.stats[n][sortStat]||0 }));
                    return shareCard.share(
                      <LeaderboardShareCard title={`${a.label.toUpperCase()} SEASON · TOP ${STAT_LABELS[sortStat]}`} subtitle={`Section FC · ${a.division}`} rows={rows} valueKey={sortStat} valueSuffix="" />,
                      { filename:`section-fc-${a.id}-leaders.png`, caption:`Section FC — ${a.label} season ${STAT_LABELS[sortStat]} leaders`, urlPath:SCREEN_PATHS.stats }
                    );
                  }}
                />
              </div>
              <StatsTable data={a.stats} updateFn={null} />
            </div>
          ))}
        </main>
        {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
        {shareCard.portal}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TABLE SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "table") {
    const view    = SEASONS.find(x => x.id === viewSeason) || SEASON;
    const live    = view === SEASON;
    const table   = tableFor(view);
    const hasTies = table.some(r => posLabel(r, table).startsWith("="));
    return (
      <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
        <style>{CSS}</style>
        <Header {...sharedProps} />
        <main style={{padding:"22px 14px",maxWidth:700,margin:"0 auto"}}>
          <div style={{marginBottom:18,display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#e8ff00",letterSpacing:4,marginBottom:5}}>◆ {view.division.toUpperCase()} · {view.label.toUpperCase()}{live ? "" : " · FINAL"}</div>
              <h1 style={{fontFamily:"'Oswald',sans-serif",fontSize:"clamp(1.6rem,5vw,2.8rem)",fontWeight:700,lineHeight:1}}>POWERLEAGUE TABLE</h1>
            </div>
            <SeasonSwitch value={view.id} onChange={setViewSeason} />
          </div>
          <div ref={refTable}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{borderBottom:"2px solid #ffffff20"}}>
                  {["#","TEAM","PL","W","D","L","GF","GA","GD","PTS"].map((h,i) => (
                    <th key={i} className={h==="GF"||h==="GA"?"hide-sm":undefined} style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:2,color:"#ffffff44",fontWeight:600,padding:"9px 5px",textAlign:i<2?"left":"center",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.map((row, i) => {
                  const sfc = isSFC(row.team);
                  return (
                    <tr key={row.team} style={{borderBottom:`1px solid ${sfc?"#e8ff0025":"#ffffff08"}`,background:sfc?"#e8ff0008":i%2===0?"transparent":"#ffffff02",animation:"fadeUp .35s ease both",animationDelay:`${i*.03}s`}}>
                      <td style={{padding:"11px 4px",textAlign:"center"}}>
                        <div style={{minWidth:22,height:22,padding:"0 3px",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".75rem",background:row.pos<=2?"#e8ff00":"transparent",color:row.pos<=2?"#0a0a0f":"#ffffffcc"}}>{posLabel(row, table)}</div>
                      </td>
                      <td style={{padding:"11px 5px",fontFamily:"'Oswald',sans-serif",fontWeight:sfc?700:500,fontSize:".9rem",color:sfc?"#e8ff00":"#ffffffcc"}}>
                        {sfc && <span style={{marginRight:5}}>★</span>}{row.team}
                      </td>
                      {[row.pl,row.w,row.d,row.l,row.gf,row.ga].map((v,j) => (
                        <td key={j} className={j>=4?"hide-sm":undefined} style={{padding:"11px 4px",textAlign:"center",fontFamily:"'Oswald',sans-serif",fontWeight:500,fontSize:".88rem",color:"#ffffffaa"}}>{v}</td>
                      ))}
                      <td style={{padding:"11px 4px",textAlign:"center",fontFamily:"'Oswald',sans-serif",fontWeight:600,fontSize:".88rem",color:row.gd>0?"#44dd88":row.gd<0?"#ff6644":"#ffffffaa"}}>{row.gd>0?"+":""}{row.gd}</td>
                      <td style={{padding:"11px 4px",textAlign:"center",fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".95rem",color:sfc?"#e8ff00":"#fff"}}>{row.pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {table.length === 0 && (
              <div style={{padding:"36px",textAlign:"center",color:"#ffffff30",fontFamily:"'Oswald',sans-serif",fontSize:".8rem",letterSpacing:2}}>NO GAMES PLAYED YET</div>
            )}
          </div>
          <div style={{marginTop:12,fontFamily:"'Oswald',sans-serif",fontSize:".56rem",letterSpacing:2,color:"#ffffff40",lineHeight:1.8}}>
            {live && view.results.length > 0 && <div>AFTER {view.results[0].date.toUpperCase()}</div>}
            {hasTies && <div>= LEVEL ON POINTS, GOAL DIFFERENCE AND GOALS SCORED</div>}
            {view.tableNote && <div>{view.tableNote.toUpperCase()}</div>}
          </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginTop:16,flexWrap:"wrap"}}>
            {!live && view.review
              ? <button className="link-btn" onClick={() => setScreen("season")} style={{color:"#e8ff00"}}>READ THE {view.label.toUpperCase()} REVIEW →</button>
              : <span />}
            <ShareButton
              label="SHARE TABLE"
              getNode={() => refTable.current}
              caption={`${view.division} table · ${view.label}`}
              filename={`section-fc-table-${view.id}.png`}
              urlPath={SCREEN_PATHS.table}
            />
          </div>
        </main>
        {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
        {shareCard.portal}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FIXTURES SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "fixtures") {
    const view     = SEASONS.find(x => x.id === viewSeason) || SEASON;
    const live     = view === SEASON;
    const fixtures = live ? FIXTURES : [];
    const openReport = r => { setExpandedArchive(r.id); setScrollToReport(r.id); setScreen("report"); };
    return (
      <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
        <style>{CSS}</style>
        <Header {...sharedProps} />
        <main style={{padding:"22px 14px",maxWidth:680,margin:"0 auto"}}>

          <div style={{marginBottom:20,display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#e8ff00",letterSpacing:4,marginBottom:5}}>◆ {view.division.toUpperCase()} · {view.label.toUpperCase()}</div>
              <h1 style={{fontFamily:"'Oswald',sans-serif",fontSize:"clamp(1.6rem,5vw,2.8rem)",fontWeight:700,lineHeight:1}}>{live ? "FIXTURES & RESULTS" : "RESULTS"}</h1>
            </div>
            <SeasonSwitch value={view.id} onChange={setViewSeason} />
          </div>

          {/* ── Upcoming Fixtures ── */}
          {live && (
            <>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:12}}>
                <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#ffffff55",letterSpacing:4}}>◆ UPCOMING FIXTURES</div>
                {fixtures.length > 0 && (
                  <ShareButton
                    label="SHARE FIXTURES"
                    onShare={() => shareCard.share(
                      <FixturesShareCard fixtures={sfcFixtures} season={SEASON} />,
                      { filename:"section-fc-fixtures.png", caption:`SECTION FC fixtures — ${SEASON.label}`, urlPath:SCREEN_PATHS.fixtures }
                    )}
                  />
                )}
              </div>
              <div>
              {fixtures.length === 0 && (
                <div style={{background:"#ffffff05",border:"1px dashed #ffffff1c",padding:"20px",textAlign:"center",marginBottom:8}}>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".95rem",letterSpacing:3,color:"#ffffffcc",marginBottom:6}}>FIXTURES TBC</div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:2,color:"#ffffff45",lineHeight:1.7}}>
                    THEY GO UP HERE AS SOON AS THE LEAGUE PUBLISHES THEM
                  </div>
                </div>
              )}
              {fixtures.map((gw, gi) => (
                <div key={gi} style={{marginBottom:24,animation:"fadeUp .4s ease both",animationDelay:`${gi*.08}s`}}>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".75rem",letterSpacing:3,color:"#e8ff00",marginBottom:10,paddingBottom:8,borderBottom:"1px solid #e8ff0033"}}>{gw.date}</div>
                  {gw.matches.map((m, mi) => {
                    const sfcGame = isSFC(m.home) || isSFC(m.away);
                    return (
                      <div key={mi} style={{display:"flex",alignItems:"center",background:sfcGame?"#e8ff0008":"#ffffff05",border:`1px solid ${sfcGame?"#e8ff0030":"#ffffff0e"}`,padding:"10px 12px",marginBottom:5}}>
                        <div style={{width:56,fontFamily:"'Oswald',sans-serif",fontSize:".7rem",fontWeight:600,color:sfcGame?"#e8ff00":"#ffffff44",letterSpacing:1,flexShrink:0}}>{m.time}</div>
                        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                          <div style={{flex:1,textAlign:"right",fontFamily:"'Oswald',sans-serif",fontWeight:isSFC(m.home)?700:500,fontSize:".9rem",color:isSFC(m.home)?"#e8ff00":"#ffffffbb"}}>{m.home==="VACANCY"?"TBD":m.home}</div>
                          <div style={{padding:"3px 8px",background:"#ffffff10",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".68rem",color:"#ffffff44",flexShrink:0}}>VS</div>
                          <div style={{flex:1,fontFamily:"'Oswald',sans-serif",fontWeight:isSFC(m.away)?700:500,fontSize:".9rem",color:isSFC(m.away)?"#e8ff00":"#ffffffbb"}}>{m.away==="VACANCY"?"TBD":m.away}</div>
                        </div>
                        <div style={{width:52,textAlign:"right",fontFamily:"'Oswald',sans-serif",fontSize:".58rem",color:"#ffffff25",flexShrink:0,marginRight:6}}>{m.pitch}</div>
                        {sfcGame && (
                          <span data-share-hide="1">
                            <ShareButton
                              variant="icon"
                              size={26}
                              onShare={() => shareCard.share(
                                <FixtureShareCard fixture={{...m, date: gw.date}} label="FIXTURE" />,
                                {
                                  filename:"section-fc-fixture.png",
                                  caption:`SECTION FC ${isSFC(m.home)?"vs":"@"} ${isSFC(m.home)?m.away:m.home} — ${gw.date} ${m.time}`,
                                  urlPath:SCREEN_PATHS.fixtures,
                                }
                              )}
                            />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              </div>
            </>
          )}

          {/* ── Results ── */}
          {view.results.length > 0 && (
            <div style={{marginTop:live ? 30 : 0,marginBottom:14,paddingTop:live ? 24 : 0,borderTop:live ? "1px solid #ffffff12" : "none"}}>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#ffffff55",letterSpacing:4}}>◆ {live ? "RESULTS" : "EVERY GAMEWEEK"}</div>
            </div>
          )}
          {view.results.map((gw, gi) => (
            <div key={gw.date} style={{marginBottom:22,animation:"fadeUp .4s ease both",animationDelay:`${Math.min(gi,10)*.05}s`}}>
              <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".75rem",letterSpacing:3,color:"#ffffff55",marginBottom:10,paddingBottom:8,borderBottom:"1px solid #ffffff1a"}}>{gw.date}</div>
              {gw.matches.map((m, mi) => {
                const sfcGame = isSFC(m.home) || isSFC(m.away);
                const sfcWon  = sfcGame && (isSFC(m.home) ? m.hg > m.ag : m.ag > m.hg);
                const sfcDraw = sfcGame && m.hg === m.ag;
                const sfcLost = sfcGame && !sfcWon && !sfcDraw;
                const badge   = sfcWon ? {label:"W",bg:"#22aa44"} : sfcDraw ? {label:"D",bg:"#cc8800"} : sfcLost ? {label:"L",bg:"#cc3333"} : null;
                const report  = sfcGame ? findReport(gw.date, isSFC(m.home) ? m.away : m.home) : null;
                const scorers = (report?.players || []).filter(p => p.played !== false && (parseInt(p.goals) || 0) > 0).sort((a, b) => b.goals - a.goals);
                const Row = report ? "button" : "div";
                return (
                  <Row key={mi} {...(report ? { onClick: () => openReport(report), className: "tap-card", title: "Read the match report" } : {})}
                    style={{display:"block",width:"100%",textAlign:"left",color:"#fff",fontFamily:"inherit",cursor:report ? "pointer" : "default",background:sfcGame?"#e8ff0008":"#ffffff04",border:`1px solid ${sfcGame?"#e8ff0020":"#ffffff0a"}`,padding:"9px 12px",marginBottom:5}}>
                    <div style={{display:"flex",alignItems:"center"}}>
                      {badge
                        ? <div style={{width:22,height:22,background:badge.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".65rem",color:"#fff",flexShrink:0,marginRight:8,letterSpacing:0}}>{badge.label}</div>
                        : <div style={{width:22,marginRight:8,flexShrink:0}} />}
                      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,minWidth:0}}>
                        <div style={{flex:1,textAlign:"right",fontFamily:"'Oswald',sans-serif",fontWeight:isSFC(m.home)?700:400,fontSize:".88rem",color:isSFC(m.home)?"#e8ff00":"#ffffffaa"}}>{m.home}</div>
                        <div style={{display:"flex",gap:3,flexShrink:0}}>
                          <div style={{width:26,height:26,background:"#1a1a22",border:"1px solid #ffffff18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".85rem",color:isSFC(m.home)?"#e8ff00":"#fff"}}>{m.hg}</div>
                          <div style={{width:26,height:26,background:"#1a1a22",border:"1px solid #ffffff18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".85rem",color:isSFC(m.away)?"#e8ff00":"#fff"}}>{m.ag}</div>
                        </div>
                        <div style={{flex:1,fontFamily:"'Oswald',sans-serif",fontWeight:isSFC(m.away)?700:400,fontSize:".88rem",color:isSFC(m.away)?"#e8ff00":"#ffffffaa"}}>{m.away}</div>
                      </div>
                    </div>
                    {report && (
                      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:10,marginTop:7,paddingLeft:30}}>
                        <div style={{fontSize:".82rem",color:"#ffffff88",lineHeight:1.45}}>
                          {scorers.length
                            ? scorers.map(p => `${p.name}${p.goals > 1 ? ` ${p.goals}` : ""}`).join(", ")
                            : "No scorers logged"}
                        </div>
                        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:2,color:"#e8ff0099",flexShrink:0}}>REPORT →</div>
                      </div>
                    )}
                  </Row>
                );
              })}
            </div>
          ))}
          {view.results.length === 0 && (
            <div style={{padding:"36px",textAlign:"center",color:"#ffffff30",fontFamily:"'Oswald',sans-serif",fontSize:".8rem",letterSpacing:2}}>NO RESULTS YET</div>
          )}

          {!live && view.review && (
            <button className="link-btn" onClick={() => setScreen("season")} style={{color:"#e8ff00",marginTop:6}}>READ THE {view.label.toUpperCase()} REVIEW →</button>
          )}

        </main>
        {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
        {shareCard.portal}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // END OF SEASON SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "season") {
    // The closed 2026 season, read entirely from src/seasons/2026.js.
    const SEASON_REVIEW = SEASON_2026.review;
    const run      = seasonRun(SEASON_2026.results);
    const sfcRow   = SEASON_2026.table.find(t => t.team === "SECTION FC");
    const below    = SEASON_2026.table.find(t => t.pos === sfcRow.pos + 1);
    const finale   = run[run.length - 1];

    // The season splits in two at the night it turned — the 3-2 over Karachi.
    const turnIdx  = run.findIndex(g => g.date === SEASON_REVIEW.turnDate);
    const splitAt  = turnIdx > 0 ? turnIdx : Math.floor(run.length / 2);
    const before   = runTotals(run.slice(0, splitAt));
    const after    = runTotals(run.slice(splitAt));

    // Unbeaten streak the season finished on.
    let unbeaten = 0;
    for (let i = run.length - 1; i >= 0 && run[i].res !== "L"; i--) unbeaten++;

    // Season leaders come from the final totals frozen at the end of the season.
    const final = SEASON_2026.stats;
    const topBy = key => {
      const ranked = Object.keys(final).filter(p => (final[p][key] || 0) > 0)
        .sort((a, b) => (final[b][key] || 0) - (final[a][key] || 0));
      if (!ranked.length) return null;
      const best = final[ranked[0]][key];
      return { names: ranked.filter(p => final[p][key] === best), value: best };
    };

    const resColor = { W:"#22aa44", D:"#cc8800", L:"#cc3333" };

    const Split = ({ label, sub, t, accent }) => (
      <div style={{flex:"1 1 160px",background:"#ffffff05",border:`1px solid ${accent}33`,padding:"14px 14px 12px"}}>
        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:3,color:accent,marginBottom:2}}>{label}</div>
        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:1,color:"#ffffff35",marginBottom:10}}>{sub}</div>
        <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:6}}>
          <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"2.1rem",lineHeight:1,color:accent}}>{t.pts}</span>
          <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:2,color:"#ffffff45"}}>PTS FROM {t.pl * 3}</span>
        </div>
        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".72rem",letterSpacing:1,color:"#ffffffaa"}}>{t.w}W {t.d}D {t.l}L</div>
        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".72rem",letterSpacing:1,color:"#ffffff55"}}>{t.gf}–{t.ga} goals</div>
      </div>
    );

    const AwardRow = ({ icon, label, statKey, suffix }) => {
      const top = topBy(statKey);
      if (!top) return null;
      return (
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #ffffff0a"}}>
          <span style={{fontSize:"1.1rem",width:24,textAlign:"center",flexShrink:0}}>{icon}</span>
          <div style={{width:96,fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:2,color:"#ffffff45",flexShrink:0}}>{label}</div>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
            {top.names.map(n => (
              <span key={n} style={{display:"flex",alignItems:"center",gap:6}}>
                <Avatar name={n} size={24} />
                <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".85rem"}}>{n}</span>
              </span>
            ))}
          </div>
          <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".95rem",color:"#e8ff00",flexShrink:0}}>{top.value}<span style={{fontSize:".55rem",letterSpacing:1,color:"#ffffff40",marginLeft:3}}>{suffix}</span></div>
        </div>
      );
    };

    return (
      <div style={{minHeight:"100vh",background:"#060608",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
        <style>{CSS}</style>
        <Header {...sharedProps} />
        <main style={{padding:"22px 14px 60px",maxWidth:680,margin:"0 auto"}}>

          {/* ── HERO ── */}
          <div ref={refSeason} style={{background:"radial-gradient(ellipse at 50% 0%, #e8ff0018, transparent 70%)",border:"1px solid #e8ff0033",padding:"26px 20px 22px",textAlign:"center",marginBottom:14}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:5,color:"#e8ff00",marginBottom:6}}>◆ END OF SEASON {SEASON_REVIEW.season} · {SEASON_REVIEW.division.toUpperCase()}</div>
            <h1 style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"clamp(1.5rem,6vw,2.6rem)",letterSpacing:-1,lineHeight:1,marginBottom:12}}>{SEASON_REVIEW.title}</h1>
            <div style={{display:"inline-block",padding:"6px 18px",background:"#22aa4418",border:"1px solid #22aa4455",marginBottom:14}}>
              <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"clamp(1.6rem,7vw,2.6rem)",letterSpacing:2,color:"#44dd88",lineHeight:1}}>{SEASON_REVIEW.verdict}</span>
            </div>
            <div style={{fontSize:".95rem",color:"#ffffffaa",lineHeight:1.45,maxWidth:440,margin:"0 auto 18px"}}>{SEASON_REVIEW.standfirst}</div>

            <div style={{display:"flex",justifyContent:"center",gap:0,flexWrap:"wrap",borderTop:"1px solid #ffffff12",paddingTop:16}}>
              {[
                ["FINISHED", ordinal(sfcRow.pos).toUpperCase()],
                ["POINTS",   sfcRow.pts],
                ["RECORD",   `${sfcRow.w}-${sfcRow.d}-${sfcRow.l}`],
                ["GOALS",    `${sfcRow.gf}–${sfcRow.ga}`],
              ].map(([k, v]) => (
                <div key={k} style={{flex:"1 1 80px",padding:"0 6px"}}>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"clamp(1.1rem,4.5vw,1.6rem)",color:"#e8ff00",lineHeight:1.1}}>{v}</div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".52rem",letterSpacing:2,color:"#ffffff40",marginTop:3}}>{k}</div>
                </div>
              ))}
            </div>
            {below && (
              <div style={{marginTop:14,fontFamily:"'Oswald',sans-serif",fontSize:".66rem",letterSpacing:2,color:"#44dd88"}}>
                ↑ {sfcRow.pts - below.pts} PT{sfcRow.pts - below.pts !== 1 ? "S" : ""} ABOVE {below.team.toUpperCase()}
              </div>
            )}
          </div>

          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:22}}>
            <ShareButton
              label="SHARE SEASON"
              getNode={() => refSeason.current}
              caption={`SECTION FC — ${SEASON_REVIEW.season} season: ${ordinal(sfcRow.pos)} in ${SEASON_REVIEW.division}, ${sfcRow.pts} points. ${SEASON_REVIEW.verdict}.`}
              filename="section-fc-season-2026.png"
              urlPath={SCREEN_PATHS.season}
            />
          </div>

          {/* ── TWO SEASONS IN ONE ── */}
          <SectionHead kicker="◆ TWO SEASONS IN ONE" title="THE TURNAROUND" />
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
            <Split label="FIRST" sub={`${before.pl} GAMES`} t={before} accent="#ff5555" />
            <Split label="THEN"  sub={`LAST ${after.pl} GAMES`} t={after} accent="#44dd88" />
          </div>
          {unbeaten >= 2 && (
            <div style={{background:"#44dd8810",border:"1px solid #44dd8833",padding:"11px 14px",marginBottom:26,fontFamily:"'Oswald',sans-serif",fontSize:".72rem",letterSpacing:2,color:"#44dd88"}}>
              ✓ FINISHED THE SEASON UNBEATEN IN {unbeaten}
            </div>
          )}

          {/* ── THE WHOLE RUN ── */}
          <SectionHead kicker="◆ EVERY GAME" title="THE RUN" />
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
            {run.map((g, i) => (
              <div key={i} title={`${g.date} — ${g.home ? "v" : "@"} ${g.opp} ${g.gf}-${g.ga}`}
                   style={{width:30,height:30,background:`${resColor[g.res]}22`,border:`1px solid ${resColor[g.res]}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".7rem",color:resColor[g.res]}}>
                {g.res}
              </div>
            ))}
          </div>
          {finale && (
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:2,color:"#ffffff35",marginBottom:26}}>
              LAST GAME · {finale.date.toUpperCase()} · {finale.home ? "V" : "@"} {finale.opp.toUpperCase()} {finale.gf}–{finale.ga}
            </div>
          )}

          {/* ── THE STORY ── */}
          <SectionHead kicker="◆ HOW IT HAPPENED" title="THE SEASON" />
          <div style={{marginBottom:26}}>
            {SEASON_REVIEW.story.map((para, i) => (
              <p key={i} style={{fontSize:"1rem",lineHeight:1.62,color:"#ffffffc0",marginBottom:14}}>{para}</p>
            ))}
          </div>

          {/* ── AWARDS FROM THE NUMBERS ── */}
          <SectionHead kicker="◆ THE NUMBERS" title="SEASON LEADERS" />
          <div style={{background:"#ffffff05",border:"1px solid #ffffff12",padding:"6px 14px 10px",marginBottom:26}}>
            <AwardRow icon="⚽"  label="TOP SCORER"   statKey="goals"       suffix="gls"  />
            <AwardRow icon="👑"  label="ASSISTS"      statKey="assists"     suffix="ast"  />
            <AwardRow icon="🛡️" label="APPEARANCES"  statKey="apps"        suffix="apps" />
            <AwardRow icon="🧤"  label="CLEAN SHEETS" statKey="cleanSheets" suffix="cs"   />
            <AwardRow icon="🌟"  label="MOTM"         statKey="motm"        suffix="motm" />
            <button className="link-btn" onClick={() => { setStatsTab(SEASON_2026.id); setScreen("stats"); }}
                    style={{fontSize:".54rem",letterSpacing:1.5,color:"#ffffff40",paddingTop:10,textAlign:"left"}}>
              FINAL SEASON TOTALS · SEE THE FULL {SEASON_2026.label.toUpperCase()} TABLE →
            </button>
          </div>

          {/* ── PROPS TO THE PLAYERS ── */}
          <SectionHead kicker="◆ EVERY ONE OF YOU" title="PROPS TO THE PLAYERS" />
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:26}}>
            {SEASON_REVIEW.props.map((p, i) => (
              <div key={p.name} style={{background:i%2===0?"#ffffff05":"#ffffff03",border:"1px solid #ffffff0e",padding:"13px 14px",animation:"fadeUp .4s ease both",animationDelay:`${i*.03}s`}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <Avatar name={p.name} size={38} />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"1rem",letterSpacing:.5}}>{p.name}</div>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:2,color:"#e8ff00"}}>{p.tag.toUpperCase()}</div>
                  </div>
                </div>
                <div style={{fontSize:".95rem",lineHeight:1.55,color:"#ffffffaa"}}>{p.text}</div>
              </div>
            ))}
          </div>

          {/* ── THE GAFFA ── */}
          <SectionHead kicker="◆ AND THE MAN WHO PICKED THE TEAM" title="THE GAFFA" />
          <div style={{background:"radial-gradient(ellipse at 50% 0%, #FFD70012, transparent 70%)",border:"1px solid #FFD70044",padding:"20px 18px",marginBottom:26}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <Avatar name={SEASON_REVIEW.manager.name} size={56} border="#FFD700" />
              <div>
                <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"1.35rem",letterSpacing:.5}}>{SEASON_REVIEW.manager.name}</div>
                <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:3,color:"#FFD700"}}>{SEASON_REVIEW.manager.tag.toUpperCase()}</div>
              </div>
            </div>
            {SEASON_REVIEW.manager.text.map((para, i) => (
              <p key={i} style={{fontSize:"1rem",lineHeight:1.6,color:"#ffffffb5",marginBottom:12}}>{para}</p>
            ))}
          </div>

          {/* ── SIGN OFF ── */}
          <div style={{textAlign:"center",padding:"24px 14px",borderTop:"1px solid #ffffff12"}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(1rem,3.6vw,1.3rem)",lineHeight:1.4,color:"#e8ff00",letterSpacing:.5}}>
              {SEASON_REVIEW.signoff}
            </div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:4,color:"#ffffff28",marginTop:12}}>
              SECTION FC · {SEASON_REVIEW.season} · SEE YOU NEXT SEASON
            </div>
          </div>

        </main>
        {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
        {shareCard.portal}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HALL OF FAME SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "halloffame") {
    const aw = AWARDS[activeAward];
    const winner = awardWinners[aw.id];
    const winnerImg = winner ? avatar(winner) : null;
    const allForSelect = [...new Set([...KNOWN_PLAYERS, ...squad])];
    return (
      <div style={{minHeight:"100vh",background:"#060608",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
        <style>{CSS}</style>
        <Header {...sharedProps} />
        <div style={{textAlign:"center",padding:"22px 14px 0"}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#e8ff00",letterSpacing:5,marginBottom:4}}>◆ SECTION FC</div>
          <h1 style={{fontFamily:"'Oswald',sans-serif",fontSize:"clamp(2rem,7vw,3.5rem)",fontWeight:700,letterSpacing:-1,lineHeight:1,marginBottom:18}}>HALL OF FAME</h1>
          <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:20}}>
            {AWARDS.map((a,i) => (
              <button key={i} onClick={() => { setActiveAward(i); setEditingAwards(false); }} style={{width:i===activeAward?28:8,height:8,borderRadius:4,background:i===activeAward?AWARDS[activeAward].color:"#ffffff22",border:"none",cursor:"pointer",transition:"all .3s"}} />
            ))}
          </div>
        </div>
        <div key={activeAward} className="award-card" style={{maxWidth:400,margin:"0 auto",padding:"0 20px 30px"}}>
          <div ref={refHallOfFame} style={{position:"relative",background:`radial-gradient(ellipse at 50% 40%, ${aw.glow}, transparent 70%)`,borderRadius:12,border:`1px solid ${aw.color}33`,padding:"28px 20px 22px",textAlign:"center"}}>
            <div style={{fontSize:"3.2rem",marginBottom:8,lineHeight:1}} className="trophy">{aw.icon}</div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"clamp(1.5rem,5vw,2.3rem)",letterSpacing:-1,color:aw.color,marginBottom:3,textTransform:"uppercase"}}>{aw.name}</div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".68rem",letterSpacing:3,color:"#ffffff44",marginBottom:22}}>{aw.desc}</div>
            {winner ? (
              <div style={{animation:"fadeUp .5s ease"}}>
                {winnerImg
                  ? <img src={winnerImg} alt={winner} style={{width:100,height:100,borderRadius:"50%",objectFit:"cover",border:`4px solid ${aw.color}`,boxShadow:`0 0 30px ${aw.glow}`,marginBottom:12}} />
                  : <div style={{width:100,height:100,borderRadius:"50%",background:"#ffffff15",border:`4px solid ${aw.color}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",fontSize:"2rem",color:aw.color,fontFamily:"'Oswald',sans-serif"}}>{firstWord(winner)[0]}</div>
                }
                <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"clamp(1.3rem,5vw,1.9rem)",letterSpacing:1,color:"#fff",textTransform:"uppercase"}}>{winner}</div>
                <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:aw.color,marginTop:4}}>🏆 WINNER</div>
              </div>
            ) : (
              <div style={{padding:"28px 0",color:"#ffffff30",fontFamily:"'Oswald',sans-serif",fontSize:".8rem",letterSpacing:2}}>AWARD NOT YET ASSIGNED</div>
            )}
            {isAdmin && (
              editingAwards ? (
                <div data-share-hide="1" style={{marginTop:16}}>
                  <select value={winner||""} onChange={e => saveAward(aw.id, e.target.value)} style={{width:"100%",marginBottom:10}}>
                    <option value="">— Remove winner —</option>
                    {allForSelect.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button className="btn btn-y" onClick={() => setEditingAwards(false)} style={{width:"100%",padding:"10px"}}>DONE ✓</button>
                </div>
              ) : (
                <button data-share-hide="1" className="btn btn-ghost" onClick={() => setEditingAwards(true)} style={{marginTop:14}}>✏️ ASSIGN WINNER</button>
              )
            )}
          </div>
          {winner && (
            <div style={{marginTop:12,display:"flex",justifyContent:"center"}}>
              <ShareButton
                label={`SHARE ${aw.name.toUpperCase()}`}
                getNode={() => refHallOfFame.current}
                caption={`${winner} — ${aw.name} 🏆`}
                filename={`section-fc-${aw.id}.png`}
                urlPath={SCREEN_PATHS.halloffame}
              />
            </div>
          )}
          <div style={{display:"flex",justifyContent:"space-between",marginTop:12}}>
            <button className="btn btn-ghost" onClick={() => { setActiveAward(i => (i-1+AWARDS.length)%AWARDS.length); setEditingAwards(false); }}>← PREV</button>
            <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#ffffff30",letterSpacing:2,alignSelf:"center"}}>{activeAward+1} / {AWARDS.length}</span>
            <button className="btn btn-ghost" onClick={() => { setActiveAward(i => (i+1)%AWARDS.length); setEditingAwards(false); }}>NEXT →</button>
          </div>
        </div>
        {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
        {shareCard.portal}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PREDICTOR SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "predictor") return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
      <style>{CSS}</style>
      <Header {...sharedProps} />
      <main style={{padding:"22px 14px",maxWidth:560,margin:"0 auto"}}>
        <div style={{marginBottom:18}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#e8ff00",letterSpacing:4,marginBottom:5}}>◆ SCORE PREDICTOR</div>
          <h1 style={{fontFamily:"'Oswald',sans-serif",fontSize:"clamp(1.6rem,5vw,2.6rem)",fontWeight:700,lineHeight:1}}>PREDICT THE SCORE</h1>
        </div>

        {/* Admin: set up match */}
        {isAdmin && !predSetup && (
          <div style={{marginBottom:20}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:3,color:"#ffffff44",marginBottom:10}}>SELECT MATCH TO OPEN FOR PREDICTIONS</div>
            {sfcFixtures.length === 0 && (
              <div style={{padding:"16px",background:"#ffffff05",border:"1px dashed #ffffff1c",fontFamily:"'Oswald',sans-serif",fontSize:".66rem",letterSpacing:1.5,color:"#ffffff55",lineHeight:1.6}}>
                No fixtures published yet. Our next game shows up here to open once it's in the {SEASON.label} fixture list.
              </div>
            )}
            {sfcFixtures.map((m, i) => {
              const opp = isSFC(m.home) ? m.away : m.home;
              return (
                <button key={i} onClick={() => setupPredMatch({opp, date:m.date, home:m.home, away:m.away})} style={{display:"block",width:"100%",background:"#ffffff08",border:"1px solid #ffffff14",padding:"12px 16px",cursor:"pointer",textAlign:"left",marginBottom:6,transition:"all .15s"}} className="pred-row">
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".95rem",color:"#e8ff00"}}>SECTION FC vs {opp==="VACANCY"?"TBD":opp}</div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#ffffff44",letterSpacing:2,marginTop:2}}>{m.date} · {m.time}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Non-admin, no active match */}
        {!isAdmin && !predSetup && (
          <div style={{padding:"40px 20px",textAlign:"center",background:"#ffffff05",border:"1px solid #ffffff0e"}}>
            <div style={{fontSize:"2rem",marginBottom:12}}>⏳</div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"1rem",color:"#ffffff55",letterSpacing:2}}>NO ACTIVE PREDICTION</div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#ffffff30",letterSpacing:1,marginTop:8}}>The manager will open predictions before matchday</div>
          </div>
        )}

        {predSetup && (() => {
          const oppName = predMatch.opp === "VACANCY" ? "TBD" : predMatch.opp;
          const sfcRow  = LEAGUE_TABLE.find(t => t.team === "SECTION FC");
          const oppRow  = LEAGUE_TABLE.find(t => t.team.toLowerCase() === predMatch.opp.toLowerCase());
          const odds = (() => {
            if (!sfcRow || !oppRow || sfcRow.pl === 0 || oppRow.pl === 0) return null;
            const rawW = (sfcRow.w/sfcRow.pl + oppRow.l/oppRow.pl) / 2;
            const rawD = (sfcRow.d/sfcRow.pl + oppRow.d/oppRow.pl) / 2;
            const rawL = (sfcRow.l/sfcRow.pl + oppRow.w/oppRow.pl) / 2;
            const tot  = rawW + rawD + rawL;
            const toFrac = p => {
              const profit = (1/(p/tot)) - 1;
              let bestN=1,bestD=1,bestErr=Infinity;
              for (let d=1;d<=20;d++){const n=Math.round(profit*d);if(n<=0)continue;const err=Math.abs(n/d-profit);if(err<bestErr){bestErr=err;bestN=n;bestD=d;}}
              const gcd=(a,b)=>b===0?a:gcd(b,a%b);const g=gcd(bestN,bestD);
              return `${bestN/g}/${bestD/g}`;
            };
            return { win: toFrac(rawW), draw: toFrac(rawD), lose: toFrac(rawL) };
          })();
          return (
          <>
            {/* Active match banner */}
            <div style={{background:"#e8ff0010",border:"1px solid #e8ff0033",padding:"16px 18px",marginBottom:18}}>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#e8ff0088",marginBottom:10}}>PREDICT THIS MATCH</div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,marginBottom:4}}>
                <div style={{flex:1,fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"clamp(1.1rem,4.5vw,1.7rem)",color:"#e8ff00",lineHeight:1}}>SECTION FC</div>
                <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:400,fontSize:"clamp(.75rem,2.5vw,.95rem)",color:"#ffffff35",flexShrink:0,padding:"0 4px"}}>vs</div>
                <div style={{flex:1,textAlign:"right",fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"clamp(1.1rem,4.5vw,1.7rem)",color:"#ff7755",lineHeight:1}}>{oppName}</div>
              </div>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#ffffff44",letterSpacing:2,marginBottom: odds ? 14 : 0}}>{predMatch.date}</div>
              {odds && (
                <div style={{display:"flex",gap:6}}>
                  {[
                    {label:"WIN",  val:odds.win,  bg:"#44dd8818", border:"#44dd8844", col:"#44dd88"},
                    {label:"DRAW", val:odds.draw, bg:"#ffffff08",  border:"#ffffff18", col:"#ffffffaa"},
                    {label:"LOSE", val:odds.lose, bg:"#ff444418",  border:"#ff444440", col:"#ff6655"},
                  ].map(({label,val,bg,border,col}) => (
                    <div key={label} style={{flex:1,textAlign:"center",background:bg,border:`1px solid ${border}`,padding:"8px 4px"}}>
                      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".52rem",letterSpacing:2,color:"#ffffff44",marginBottom:3}}>{label}</div>
                      <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"clamp(1rem,3.5vw,1.2rem)",color:col,letterSpacing:1}}>{val}</div>
                    </div>
                  ))}
                </div>
              )}
              {isAdmin && !predResult && <button className="btn btn-ghost" onClick={resetPredictor} style={{marginTop:12,fontSize:".6rem"}}>✕ CLOSE PREDICTIONS</button>}
            </div>

            {/* Prediction form (visible until result revealed) */}
            {!predResult && (() => {
              const squadPlayers = [
                ...(matchdaySquad?.sTeam?.map(p => p.name) || []),
                ...(matchdaySquad?.benchTeam || []),
              ];
              return (
              <div style={{marginBottom:18}}>
                <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:3,color:"#ffffff44",marginBottom:10}}>YOUR PREDICTION</div>
                <select value={predName} onChange={e => setPredName(e.target.value)} style={{width:"100%",marginBottom:10}}>
                  <option value="">Select your name…</option>
                  {[...new Set([...KNOWN_PLAYERS,...squad])].map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                {/* Score prediction */}
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14}}>
                  <div style={{flex:1,textAlign:"center"}}>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",color:"#e8ff00",letterSpacing:2,marginBottom:5}}>SECTION FC</div>
                    <input type="number" min="0" max="20" value={predSFC} onChange={e => setPredSFC(e.target.value)} placeholder="0" style={{width:"100%",padding:"14px",background:"#ffffff0d",border:"1px solid #e8ff0044",color:"#fff",fontFamily:"'Oswald',sans-serif",fontSize:"1.8rem",fontWeight:700,textAlign:"center"}} />
                  </div>
                  <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"1.2rem",color:"#ffffff30",marginTop:22}}>-</span>
                  <div style={{flex:1,textAlign:"center"}}>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",color:"#ff7755",letterSpacing:2,marginBottom:5}}>{predMatch.opp ? predMatch.opp.split(" ")[0].toUpperCase() : "OPP"}</div>
                    <input type="number" min="0" max="20" value={predOpp} onChange={e => setPredOpp(e.target.value)} placeholder="0" style={{width:"100%",padding:"14px",background:"#ffffff0d",border:"1px solid #ff775544",color:"#fff",fontFamily:"'Oswald',sans-serif",fontSize:"1.8rem",fontWeight:700,textAlign:"center"}} />
                  </div>
                </div>

                {/* Prop: Over/Under total goals */}
                {predMatch.goalsLine != null && (
                  <div style={{marginBottom:10,background:"#ffffff06",border:"1px solid #ffffff14",padding:"14px 14px 12px"}}>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:3,color:"#e8ff0077",marginBottom:8}}>◆ PROP BET — +1 PT IF CORRECT</div>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(.95rem,3.5vw,1.1rem)",marginBottom:12}}>
                      Total goals — <span style={{color:"#e8ff00"}}>over or under {predMatch.goalsLine}</span>?
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      {[{key:"over",label:`OVER ${predMatch.goalsLine}`},{key:"under",label:`UNDER ${predMatch.goalsLine}`}].map(({key,label}) => {
                        const sel = predOverUnder === key;
                        return (
                          <button key={key} onClick={() => setPredOverUnder(sel?"":key)}
                            style={{flex:1,padding:"10px",background:sel?"#e8ff0022":"#ffffff08",border:`1px solid ${sel?"#e8ff00":"#ffffff18"}`,color:sel?"#e8ff00":"#ffffffaa",fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".82rem",cursor:"pointer",letterSpacing:1.5}}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Prop: Clean sheet */}
                {predMatch.goalsLine != null && (
                  <div style={{marginBottom:10,background:"#ffffff06",border:"1px solid #ffffff14",padding:"14px 14px 12px"}}>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:3,color:"#e8ff0077",marginBottom:8}}>◆ PROP BET — +1 PT IF CORRECT</div>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(.95rem,3.5vw,1.1rem)",marginBottom:12}}>
                      Will Section FC keep a <span style={{color:"#e8ff00"}}>clean sheet</span>?
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      {["yes","no"].map(opt => {
                        const sel = predCleanSheet === opt;
                        return (
                          <button key={opt} onClick={() => setPredCleanSheet(sel?"":opt)}
                            style={{flex:1,padding:"10px",background:sel?(opt==="yes"?"#44dd8822":"#ff444422"):"#ffffff08",border:`1px solid ${sel?(opt==="yes"?"#44dd88":"#ff4444"):"#ffffff18"}`,color:sel?(opt==="yes"?"#44dd88":"#ff4444"):"#ffffffaa",fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".9rem",cursor:"pointer",letterSpacing:2}}>
                            {opt.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Prop: Half-time leader */}
                {predMatch.goalsLine != null && (
                  <div style={{marginBottom:10,background:"#ffffff06",border:"1px solid #ffffff14",padding:"14px 14px 12px"}}>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:3,color:"#e8ff0077",marginBottom:8}}>◆ PROP BET — +1 PT IF CORRECT</div>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(.95rem,3.5vw,1.1rem)",marginBottom:12}}>
                      <span style={{color:"#e8ff00"}}>Half-time</span> leader?
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      {[
                        {key:"sfc",  label:"SECTION FC", on:"#e8ff00", onBg:"#e8ff0022"},
                        {key:"draw", label:"DRAW",       on:"#ffffffcc", onBg:"#ffffff14"},
                        {key:"opp",  label:(predMatch.opp ? predMatch.opp.split(" ")[0].toUpperCase() : "OPP"), on:"#ff7755", onBg:"#ff775522"},
                      ].map(({key,label,on,onBg}) => {
                        const sel = predHTLeader === key;
                        return (
                          <button key={key} onClick={() => setPredHTLeader(sel?"":key)}
                            style={{flex:1,padding:"10px 6px",background:sel?onBg:"#ffffff08",border:`1px solid ${sel?on:"#ffffff18"}`,color:sel?on:"#ffffffaa",fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".75rem",cursor:"pointer",letterSpacing:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Prop: Anytime scorer */}
                {predMatch.goalsLine != null && squadPlayers.length > 0 && (
                  <div style={{marginBottom:10,background:"#ffffff06",border:"1px solid #ffffff14",padding:"14px 14px 12px"}}>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:3,color:"#e8ff0077",marginBottom:8}}>◆ PROP BET — +1 PT IF CORRECT</div>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(.95rem,3.5vw,1.1rem)",marginBottom:12}}>
                      <span style={{color:"#e8ff00"}}>Anytime scorer</span> for SFC?
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                      {squadPlayers.map(name => {
                        const sel = predAnytimeScorer === name;
                        return (
                          <button key={name} onClick={() => setPredAnytimeScorer(sel?"":name)}
                            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"8px 10px",background:sel?"#e8ff0015":"#ffffff06",border:`1px solid ${sel?"#e8ff00":"#ffffff12"}`,cursor:"pointer",transition:"all .15s",minWidth:62}}>
                            <Avatar name={name} size={38} border={sel?"#e8ff00":"#ffffff22"} />
                            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:sel?700:500,fontSize:".62rem",color:sel?"#e8ff00":"#ffffffaa",letterSpacing:.5,textAlign:"center",maxWidth:62,wordBreak:"break-word",lineHeight:1.1}}>{firstWord(name)}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Legacy first-scorer prop (only if doc is from before the swap) */}
                {!predMatch.goalsLine && predMatch.propPlayer && (
                  <div style={{marginBottom:10,background:"#ffffff06",border:"1px solid #ffffff14",padding:"14px 14px 12px"}}>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:3,color:"#e8ff0077",marginBottom:10}}>◆ PROP BET — +1 PT IF CORRECT</div>
                    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                      <Avatar name={predMatch.propPlayer} size={54} border="#e8ff0055" />
                      <div>
                        <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(.95rem,3.5vw,1.15rem)",lineHeight:1.2}}>
                          Will <span style={{color:"#e8ff00"}}>{firstWord(predMatch.propPlayer)}</span> score first?
                        </div>
                        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",color:"#ffffff35",letterSpacing:1.5,marginTop:4}}>FIRST GOAL OF THE GAME</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      {["yes","no"].map(opt => (
                        <button key={opt} onClick={() => setPredFirstScorer(predFirstScorer===opt?"":opt)}
                          style={{flex:1,padding:"10px",background:predFirstScorer===opt?(opt==="yes"?"#44dd8822":"#ff444422"):"#ffffff08",border:`1px solid ${predFirstScorer===opt?(opt==="yes"?"#44dd88":"#ff4444"):"#ffffff18"}`,color:predFirstScorer===opt?(opt==="yes"?"#44dd88":"#ff4444"):"#ffffffaa",fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".9rem",cursor:"pointer",transition:"all .15s",letterSpacing:2}}>
                          {opt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prop: MOTM */}
                {squadPlayers.length > 0 && (
                  <div style={{marginBottom:14,background:"#ffffff06",border:"1px solid #ffffff14",padding:"14px 14px 12px"}}>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:3,color:"#e8ff0077",marginBottom:8}}>◆ PROP BET — +1 PT IF CORRECT</div>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(.95rem,3.5vw,1.1rem)",marginBottom:12}}>
                      Who gets <span style={{color:"#e8ff00"}}>MOTM</span>?
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                      {squadPlayers.map(name => {
                        const sel = predMotmPick === name;
                        return (
                          <button key={name} onClick={() => setPredMotmPick(sel?"":name)}
                            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"8px 10px",background:sel?"#e8ff0015":"#ffffff06",border:`1px solid ${sel?"#e8ff00":"#ffffff12"}`,cursor:"pointer",transition:"all .15s",minWidth:62}}>
                            <Avatar name={name} size={38} border={sel?"#e8ff00":"#ffffff22"} />
                            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:sel?700:500,fontSize:".62rem",color:sel?"#e8ff00":"#ffffffaa",letterSpacing:.5,textAlign:"center",maxWidth:62,wordBreak:"break-word",lineHeight:1.1}}>{firstWord(name)}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button className="btn btn-y" onClick={submitPrediction} disabled={!predName||predSFC===""|predOpp===""} style={{width:"100%",padding:"12px"}}>
                  {predictions.find(p => p.player===predName) ? "UPDATE PREDICTION" : "SUBMIT PREDICTION"}
                </button>
              </div>
              );
            })()}

            {/* Predictions list */}
            {predictions.length > 0 && (
              <div style={{marginBottom:18}}>
                <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:3,color:"#ffffff44",marginBottom:10}}>PREDICTIONS ({predictions.length})</div>
                {predictions.map((p, i) => {
                  const scoreRes = predResult ? scorePredict(p, predResult) : null;
                  const propPts = propResult
                    ? (propResult.firstScorer!==null&&propResult.firstScorer!==undefined&&p.firstScorer ? ((p.firstScorer==="yes")===propResult.firstScorer?1:0) : 0)
                      + (propResult.motm && p.motmPick                ? (p.motmPick===propResult.motm?1:0) : 0)
                      + (propResult.overUnder && p.overUnder           ? (p.overUnder===propResult.overUnder?1:0) : 0)
                      + (propResult.cleanSheet!==null&&propResult.cleanSheet!==undefined&&p.cleanSheet ? ((p.cleanSheet==="yes")===propResult.cleanSheet?1:0) : 0)
                      + (propResult.htLeader && p.htLeader             ? (p.htLeader===propResult.htLeader?1:0) : 0)
                      + (propResult.anytimeScorer && p.anytimeScorer   ? (p.anytimeScorer===propResult.anytimeScorer?1:0) : 0)
                    : 0;
                  const totalPts = (scoreRes?.pts||0) + propPts;
                  const summaryBits = [
                    p.overUnder      && `${p.overUnder.toUpperCase()} ${predMatch.goalsLine ?? ""}`.trim(),
                    p.cleanSheet     && `CS: ${p.cleanSheet.toUpperCase()}`,
                    p.htLeader       && `HT: ${p.htLeader === "sfc" ? "SFC" : p.htLeader === "opp" ? (predMatch.opp ? predMatch.opp.split(" ")[0].toUpperCase() : "OPP") : "DRAW"}`,
                    p.anytimeScorer  && `Scorer: ${firstWord(p.anytimeScorer)}`,
                    p.motmPick       && `MOTM: ${firstWord(p.motmPick)}`,
                    p.firstScorer    && `First: ${p.firstScorer.toUpperCase()}`,
                  ].filter(Boolean);
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:totalPts>=3?"#e8ff0012":totalPts>=1?"#ffffff0a":"#ffffff06",border:`1px solid ${totalPts>=3?"#e8ff0044":totalPts>=1?"#ffffff18":"#ffffff0d"}`,marginBottom:4}}>
                      <Avatar name={p.player} size={28} />
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:600,fontSize:".88rem"}}>{p.player}</div>
                        {summaryBits.length > 0 && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",color:"#ffffff35",letterSpacing:.5,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{summaryBits.join(" · ")}</div>}
                      </div>
                      <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"1rem",letterSpacing:1,flexShrink:0}}>{p.sfcG} – {p.oppG}</div>
                      {scoreRes && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",color:totalPts>=3?"#e8ff00":totalPts>=1?"#88ccff":"#ffffff44",letterSpacing:1,textAlign:"right",minWidth:52,flexShrink:0}}>{scoreRes.label}{propPts>0&&<><br/>+{propPts} prop</>}<br/><span style={{color:totalPts>0?"#e8ff00":"#ffffff30",fontSize:".7rem",fontWeight:800}}>+{totalPts}pts</span></div>}
                    </div>
                  );
                })}

                {/* Admin: reveal result */}
                {isAdmin && !predResult && (() => {
                  const squadPlayers = [
                    ...(matchdaySquad?.sTeam?.map(p => p.name) || []),
                    ...(matchdaySquad?.benchTeam || []),
                  ];
                  return (
                  <div style={{marginTop:14,padding:"14px",background:"#ffffff05",border:"1px solid #ffffff0e"}}>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:3,color:"#ffffff44",marginBottom:10}}>ENTER ACTUAL RESULT</div>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14}}>
                      <input type="number" min="0" max="20" value={resultSFC} onChange={e => setResultSFC(e.target.value)} placeholder="SFC" style={{flex:1,padding:"12px",background:"#ffffff0d",border:"1px solid #e8ff0044",color:"#fff",fontFamily:"'Oswald',sans-serif",fontSize:"1.4rem",fontWeight:700,textAlign:"center"}} />
                      <span style={{color:"#ffffff30",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"1.2rem"}}>–</span>
                      <input type="number" min="0" max="20" value={resultOpp} onChange={e => setResultOpp(e.target.value)} placeholder="OPP" style={{flex:1,padding:"12px",background:"#ffffff0d",border:"1px solid #ff775544",color:"#fff",fontFamily:"'Oswald',sans-serif",fontSize:"1.4rem",fontWeight:700,textAlign:"center"}} />
                    </div>

                    {predMatch.goalsLine != null && (
                      <>
                        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:3,color:"#ffffff44",marginBottom:6}}>OVER OR UNDER {predMatch.goalsLine}?</div>
                        <div style={{display:"flex",gap:6,marginBottom:12}}>
                          {["over","under"].map(opt => {
                            const sel = resultOverUnder === opt;
                            return (
                              <button key={opt} onClick={() => setResultOverUnder(sel?"":opt)}
                                style={{flex:1,padding:"8px",background:sel?"#e8ff0022":"#ffffff08",border:`1px solid ${sel?"#e8ff00":"#ffffff18"}`,color:sel?"#e8ff00":"#ffffffaa",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".78rem",cursor:"pointer",letterSpacing:1}}>
                                {opt.toUpperCase()} {predMatch.goalsLine}
                              </button>
                            );
                          })}
                        </div>

                        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:3,color:"#ffffff44",marginBottom:6}}>CLEAN SHEET?</div>
                        <div style={{display:"flex",gap:6,marginBottom:12}}>
                          {["yes","no"].map(opt => {
                            const sel = resultCleanSheet === opt;
                            return (
                              <button key={opt} onClick={() => setResultCleanSheet(sel?"":opt)}
                                style={{flex:1,padding:"8px",background:sel?(opt==="yes"?"#44dd8822":"#ff444422"):"#ffffff08",border:`1px solid ${sel?(opt==="yes"?"#44dd88":"#ff4444"):"#ffffff18"}`,color:sel?(opt==="yes"?"#44dd88":"#ff4444"):"#ffffffaa",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".78rem",cursor:"pointer",letterSpacing:1}}>
                                {opt.toUpperCase()}
                              </button>
                            );
                          })}
                        </div>

                        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:3,color:"#ffffff44",marginBottom:6}}>HALF-TIME LEADER</div>
                        <div style={{display:"flex",gap:6,marginBottom:12}}>
                          {[
                            {key:"sfc",  label:"SFC"},
                            {key:"draw", label:"DRAW"},
                            {key:"opp",  label:(predMatch.opp ? predMatch.opp.split(" ")[0].toUpperCase() : "OPP")},
                          ].map(({key,label}) => {
                            const sel = resultHTLeader === key;
                            return (
                              <button key={key} onClick={() => setResultHTLeader(sel?"":key)}
                                style={{flex:1,padding:"8px 4px",background:sel?"#e8ff0022":"#ffffff08",border:`1px solid ${sel?"#e8ff00":"#ffffff18"}`,color:sel?"#e8ff00":"#ffffffaa",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".75rem",cursor:"pointer",letterSpacing:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        {squadPlayers.length > 0 && (
                          <>
                            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:3,color:"#ffffff44",marginBottom:6}}>ANYTIME SFC SCORER</div>
                            <select value={resultAnytimeScorer} onChange={e => setResultAnytimeScorer(e.target.value)} style={{width:"100%",marginBottom:12}}>
                              <option value="">Select scorer (or leave blank if none)…</option>
                              {squadPlayers.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </>
                        )}
                      </>
                    )}

                    {!predMatch.goalsLine && predMatch.propPlayer && (
                      <>
                        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:3,color:"#ffffff44",marginBottom:6}}>DID {firstWord(predMatch.propPlayer).toUpperCase()} SCORE FIRST?</div>
                        <div style={{display:"flex",gap:6,marginBottom:12}}>
                          {["yes","no"].map(opt => (
                            <button key={opt} onClick={() => setResultFirstScorer(resultFirstScorer===opt?"":opt)}
                              style={{flex:1,padding:"8px",background:resultFirstScorer===opt?(opt==="yes"?"#44dd8822":"#ff444422"):"#ffffff08",border:`1px solid ${resultFirstScorer===opt?(opt==="yes"?"#44dd88":"#ff4444"):"#ffffff18"}`,color:resultFirstScorer===opt?(opt==="yes"?"#44dd88":"#ff4444"):"#ffffffaa",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".78rem",cursor:"pointer",letterSpacing:1}}>
                              {opt.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {squadPlayers.length > 0 && (
                      <>
                        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:3,color:"#ffffff44",marginBottom:6}}>ACTUAL MOTM</div>
                        <select value={resultMotm} onChange={e => setResultMotm(e.target.value)} style={{width:"100%",marginBottom:12}}>
                          <option value="">Select MOTM…</option>
                          {squadPlayers.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </>
                    )}
                    <button className="btn btn-y" onClick={revealResult} disabled={resultSFC===""||resultOpp===""} style={{width:"100%",padding:"12px 16px",fontSize:".8rem"}}>REVEAL RESULTS</button>
                  </div>
                  );
                })()}

                {predResult && (
                  <div style={{textAlign:"center",padding:"12px",background:"#ffffff08",border:"1px solid #ffffff14",marginTop:8}}>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",color:"#e8ff00",letterSpacing:3,marginBottom:4}}>FINAL RESULT</div>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"2rem",letterSpacing:2}}>SFC {predResult.sfcG} – {predResult.oppG} {predMatch.opp}</div>
                    {isAdmin && <button className="btn btn-ghost" onClick={resetPredictor} style={{marginTop:10,fontSize:".62rem"}}>START NEW PREDICTION</button>}
                  </div>
                )}
              </div>
            )}
          </>
          );
        })()}

        {/* Season Leaderboard */}
        {seasonPreds.length > 0 && (
          <div style={{marginTop:8}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:10,paddingTop:14,borderTop:"1px solid #ffffff0e"}}>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:3,color:"#e8ff00"}}>🏆 SEASON LEADERBOARD</div>
              <ShareButton
                variant="icon"
                onShare={() => shareCard.share(
                  <LeaderboardShareCard title="PREDICTOR · SEASON LEADERBOARD" subtitle="Section FC" rows={seasonPreds.map(p => ({ name:p.player, pts:p.pts }))} valueKey="pts" valueSuffix="pts" />,
                  { filename:"section-fc-predictor-leaderboard.png", caption:"Section FC Predictor — season leaderboard", urlPath:SCREEN_PATHS.predictor }
                )}
              />
            </div>
            <div ref={refPredictorBoard}>
            {seasonPreds.map((p, i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:i===0?"#e8ff0010":"#ffffff05",border:`1px solid ${i===0?"#e8ff0033":"#ffffff0a"}`,marginBottom:4}}>
                <div style={{width:22,fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"1rem",color:i===0?"#e8ff00":i===1?"#aaa":i===2?"#cd7f32":"#ffffff44",textAlign:"center"}}>{i+1}</div>
                <Avatar name={p.player} size={28} />
                <div style={{flex:1,fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".9rem"}}>{p.player}</div>
                <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#ffffff44",letterSpacing:1}}>{p.games}g</div>
                <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"1.1rem",color:i===0?"#e8ff00":"#fff",minWidth:40,textAlign:"right"}}>{p.pts}pts</div>
              </div>
            ))}
            </div>
          </div>
        )}
      </main>
      {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
        {shareCard.portal}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN ONLY: SETUP / SPIN / PITCH
  // ══════════════════════════════════════════════════════════════════════════
  if (!isAdmin && (screen === "setup" || screen === "spin" || screen === "pitch")) return null;

  if (screen === "setup") return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
      <style>{CSS}</style>
      <Header {...sharedProps} />
      <main style={{maxWidth:580,margin:"0 auto",padding:"28px 16px"}}>
        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#e8ff00",letterSpacing:4,marginBottom:6}}>◆ MATCHDAY SETUP</div>
        <h1 style={{fontFamily:"'Oswald',sans-serif",fontSize:"clamp(2rem,8vw,3.5rem)",fontWeight:700,lineHeight:1,marginBottom:26}}>BUILD YOUR<br/>SQUAD</h1>
        <section style={{marginBottom:26}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:3,color:"#fff6",marginBottom:9}}>SQUAD <span style={{color:squad.length>=5?"#e8ff00":"#ff5555"}}>({squad.length} · min 5)</span></div>
          <div style={{display:"flex",marginBottom:10}}>
            <input value={pIn} onChange={e => setPIn(e.target.value)} onKeyDown={e => e.key==="Enter"&&addPlayer()} placeholder="Add player…" style={{flex:1,padding:"12px 14px",background:"#ffffff0d",border:"1px solid #ffffff1e",borderRight:"none",color:"#fff",fontFamily:"'Oswald',sans-serif",fontSize:".9rem",letterSpacing:1}} />
            <button className="btn btn-y" style={{padding:"12px 20px",fontSize:".82rem"}} onClick={addPlayer}>+ ADD</button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {squad.map((p,i) => (
              <div key={i} style={{background:"#ffffff0d",border:"1px solid #ffffff1e",padding:"5px 10px 5px 6px",display:"flex",alignItems:"center",gap:7,animation:"fadeUp .2s ease both",animationDelay:`${i*.02}s`}}>
                <Avatar name={p} size={26} />
                <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:600,fontSize:".85rem"}}>{p}</span>
                {INJURED.includes(p) && <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".52rem",letterSpacing:1.5,color:"#ff8866"}}>INJURED</span>}
                <button onClick={() => setSquad(s => s.filter(x => x!==p))} style={{background:"none",border:"none",color:"#ff5555",cursor:"pointer",fontSize:".75rem",padding:0}}>✕</button>
              </div>
            ))}
          </div>
        </section>
        <section style={{marginBottom:28}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:3,color:"#fff6",marginBottom:9}}>THIS WEEK'S OPPONENT</div>
          <input value={oIn} onChange={e => setOIn(e.target.value)} onKeyDown={e => e.key==="Enter"&&goPick()} placeholder="Opponent team name…" style={{width:"100%",padding:"12px 14px",background:"#ffffff0d",border:"1px solid #ffffff1e",color:"#fff",fontFamily:"'Oswald',sans-serif",fontSize:".9rem",letterSpacing:1}} />
        </section>
        <button className="btn btn-y" onClick={goPick} disabled={squad.length<5||!oIn.trim()} style={{width:"100%",padding:"14px",fontSize:"1rem"}}>PICK YOUR TEAM →</button>
      </main>
      {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
        {shareCard.portal}
    </div>
  );

  if (screen === "spin") {
    const allFilled = sTeam.length === 5 && sTeam.every(p => p.name);
    return (
      <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
        <style>{CSS}</style>
        <Header {...sharedProps} />
        <main style={{maxWidth:520,margin:"0 auto",padding:"24px 16px"}}>
          <div style={{marginBottom:20}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#e8ff00",letterSpacing:4,marginBottom:5}}>◆ TEAM SELECTION</div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(1.1rem,4vw,1.7rem)"}}>
              <span style={{color:"#e8ff00"}}>SECTION FC</span><span style={{color:"#ffffff28",margin:"0 10px"}}>vs</span><span style={{color:"#ff7755"}}>{oppName}</span>
            </div>
          </div>

          {/* Starting five */}
          <div style={{marginBottom:20}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:3,color:"#ffffff44",marginBottom:9}}>STARTING FIVE</div>
            {sTeam.map((slot, i) => {
              const used = sTeam.map((t,j) => j!==i ? t.name : "").filter(Boolean).concat(benchTeam);
              const opts = squad.filter(p => !used.includes(p));
              return (
                <div key={i} style={{display:"flex",alignItems:"center",background:"#ffffff07",border:`1px solid ${slot.name?"#e8ff0033":"#ffffff0d"}`,padding:"9px 12px",gap:10,marginBottom:5,transition:"border-color .15s"}}>
                  <div style={{width:42,fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".68rem",letterSpacing:2,color:"#e8ff00",flexShrink:0}}>{slot.pos}</div>
                  {slot.name && <Avatar name={slot.name} size={30} />}
                  <select value={slot.name} onChange={e => setStarter(i, e.target.value)}
                    style={{flex:1,padding:"8px 10px",background:"#0f0f14",border:"1px solid #ffffff1e",color:slot.name?"#fff":"#ffffff44",fontFamily:"'Oswald',sans-serif",fontSize:".9rem",cursor:"pointer",outline:"none"}}>
                    <option value="">— Pick player —</option>
                    {slot.name && <option value={slot.name}>{slot.name}</option>}
                    {opts.map(p => <option key={p} value={p}>{p}{INJURED.includes(p) ? " (injured)" : ""}</option>)}
                  </select>
                </div>
              );
            })}
          </div>

          {/* Bench (up to 3 optional) */}
          <div style={{marginBottom:28}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:3,color:"#ffffff44",marginBottom:9}}>
              BENCH <span style={{fontWeight:400,color:"#ffffff25"}}>OPTIONAL · MAX 3</span>
            </div>
            {[0,1,2].map(bi => {
              const val = benchTeam[bi] || "";
              const used = sTeam.map(t => t.name).filter(Boolean).concat(benchTeam.filter((_,j) => j!==bi));
              const opts = squad.filter(p => !used.includes(p));
              return (
                <div key={bi} style={{display:"flex",alignItems:"center",background:"#ffffff04",border:`1px solid ${val?"#e8ff0022":"#ffffff08"}`,padding:"9px 12px",gap:10,marginBottom:5,transition:"border-color .15s"}}>
                  <div style={{width:42,fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".6rem",letterSpacing:2,color:"#e8ff0055",flexShrink:0}}>SUB</div>
                  {val && <Avatar name={val} size={30} />}
                  <select value={val} onChange={e => {
                    const nn = e.target.value;
                    setBenchTeam(prev => { const a=[...prev]; nn ? (a[bi]=nn) : a.splice(bi,1); return a.slice(0,3); });
                    if (nn) setSTeam(prev => prev.map(t => t.name===nn ? {...t,name:""} : t));
                  }}
                    style={{flex:1,padding:"8px 10px",background:"#0f0f14",border:"1px solid #ffffff14",color:val?"#fff":"#ffffff33",fontFamily:"'Oswald',sans-serif",fontSize:".9rem",cursor:"pointer",outline:"none"}}>
                    <option value="">— Add substitute —</option>
                    {val && <option value={val}>{val}</option>}
                    {opts.map(p => <option key={p} value={p}>{p}{INJURED.includes(p) ? " (injured)" : ""}</option>)}
                  </select>
                  {val && <button onClick={() => setBenchTeam(prev => prev.filter((_,j) => j!==bi))}
                    style={{background:"none",border:"none",color:"#ff555566",cursor:"pointer",fontSize:".8rem",padding:0,flexShrink:0}}>✕</button>}
                </div>
              );
            })}
          </div>

          {/* Opposition five — editable, saved per opponent */}
          <div style={{marginBottom:24}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:3,color:"#ffffff44",marginBottom:9,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
              <span><span style={{color:"#ff7755"}}>{oppName}</span> <span style={{color:"#ffffff25"}}>· EDIT IF KNOWN</span></span>
              <button className="btn btn-ghost btn-sm" onClick={() => setOTeam(buildOpp())} title="Replace with random legends">🎲 RANDOMISE</button>
            </div>
            {oTeam.map((slot, i) => (
              <div key={i} style={{display:"flex",alignItems:"center",background:"#ffffff05",border:"1px solid #ff77551a",padding:"9px 12px",gap:10,marginBottom:5}}>
                <div style={{width:42,fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".68rem",letterSpacing:2,color:"#ff7755",flexShrink:0}}>{slot.pos}</div>
                <input
                  value={slot.name}
                  onChange={e => {
                    const v = e.target.value;
                    setOTeam(prev => prev.map((t, j) => j === i ? { ...t, name: v } : t));
                  }}
                  placeholder="Player name…"
                  style={{flex:1,padding:"8px 10px",background:"#0f0f14",border:"1px solid #ffffff1e",color:slot.name?"#fff":"#ffffff44",fontFamily:"'Oswald',sans-serif",fontSize:".9rem",outline:"none"}}
                />
              </div>
            ))}
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:2,color:"#ffffff35",marginTop:6}}>SAVED FOR {oppName} ON PUBLISH · LEAVE BLANK FOR RANDOMS</div>
          </div>

          <button className="btn btn-y" onClick={() => setScreen("pitch")} disabled={!allFilled}
            style={{width:"100%",padding:"13px",fontSize:"1rem",opacity:allFilled?1:.35,transition:"opacity .2s"}}>
            VIEW ON PITCH →
          </button>
          <button className="btn btn-ghost" onClick={() => setScreen("setup")} style={{width:"100%",marginTop:8}}>← BACK</button>
        </main>
        {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
        {shareCard.portal}
      </div>
    );
  }

  if (screen === "pitch") {
    const oppFilled = mergeOppRoster(oTeam.map(p => ({ name: (p.name||"").trim(), pos: p.pos })));
    return (
      <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
        <style>{CSS}</style>
        <Header {...sharedProps} />
        <main style={{padding:"18px 14px",maxWidth:560,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:10,animation:"fadeUp .4s ease"}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",color:"#e8ff00",letterSpacing:4,marginBottom:4}}>◆ MATCHDAY LINEUP</div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(1rem,4vw,1.6rem)"}}>
              <span style={{color:"#e8ff00"}}>SECTION FC</span><span style={{color:"#ffffff28",margin:"0 8px"}}>vs</span><span style={{color:"#ff6644"}}>{oppName}</span>
            </div>
          </div>
          <div className="pitch-in" style={{width:"100%",maxWidth:520,margin:"0 auto 12px"}}>
            <PitchSVG sTeam={sTeam} oTeam={oppFilled} idPrefix="cs" />
          </div>
          {benchTeam.length > 0 && (
            <div style={{marginBottom:14}}>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:3,color:"#ffffff38",marginBottom:10}}>BENCH</div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                {benchTeam.map((name, i) => {
                  const img = avatar(name);
                  return (
                    <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                      <div style={{width:52,height:52,borderRadius:"50%",overflow:"hidden",border:"2px dashed #e8ff0055",background:"#1a3a22",flexShrink:0}}>
                        {img
                          ? <img src={img} alt={name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                          : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".7rem",color:"#e8ff0099"}}>SUB</div>
                        }
                      </div>
                      <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".65rem",letterSpacing:1,color:"#ffffffaa"}}>{name.split(" ")[0].toUpperCase()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:14,marginBottom:12}}>
            {[["#9eb400","#e8ff00","SECTION FC · 1-2-2"],["#aa1e00","#ff6644",`${oppName} · 1-1-2-1`]]
              .map(([bg,bo,label],i) => <div key={i} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:"50%",background:bg,border:`2px solid ${bo}`}}/><span style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:1.5,color:"#ffffffaa"}}>{label}</span></div>)}
          </div>
          <button className="btn btn-y" onClick={async () => { await publishSquad(); setScreen("squad"); }}
            style={{width:"100%",padding:"14px",fontSize:"1rem",marginBottom:9,background:"#00cc55",color:"#0a0a0f",letterSpacing:3}}>
            ✓ PUBLISH OFFICIAL SQUAD
          </button>
          <div style={{display:"flex",gap:9}}>
            <button className="btn btn-o" onClick={() => setScreen("spin")} style={{flex:1}}>← CHANGE</button>
            <button className="btn btn-ghost" onClick={() => { clearSquad(); setScreen("setup"); setOIn(""); setDone(false); setSpinning(false); closeSwaps(); setBenchTeam([]); }} style={{flex:1}}>NEW MATCHDAY</button>
          </div>
        </main>
        {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
        {shareCard.portal}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MATCH REPORT SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "report") {
    // Determine which data to show in editing form
    const draft = reportDraft || (matchReport && !matchReport.applied ? matchReport : null);
    // Posting the next squad clears the live report for the new game. Players
    // (and anyone following a /report link) still get the latest one from the
    // archive; the admin gets the start-a-new-report flow instead.
    const latest = matchReport?.applied ? matchReport : (!isAdmin ? reportArchive[0] || null : null);
    const published = (latest && !reportDraft) ? latest : null;
    const isCorrection = !!matchReport?.applied && !!reportDraft;

    // ── Shared: small number input ─────────────────────────────────────────
    const NumInput = ({ val, onChange, w=44 }) => (
      <input type="number" min="0" max="99" defaultValue={val}
        onBlur={e => onChange(parseInt(e.target.value)||0)}
        style={{width:w,padding:"5px 3px",background:"#0f0f14",border:"1px solid #ffffff1e",color:"#fff",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".85rem",textAlign:"center",outline:"none"}}
      />
    );

    // ── Rating pill with colour coding ─────────────────────────────────────
    const RatingInput = ({ val, onChange }) => {
      const r = parseFloat(val);
      const c = (!val && val!==0) ? "#ffffff22" : getRatingColor(r);
      return (
        <div style={{position:"relative",display:"inline-flex",alignItems:"center"}}>
          <input type="number" min="0" max="10" step="0.1" defaultValue={val}
            onBlur={e => onChange(e.target.value)}
            placeholder="–"
            style={{width:52,padding:"5px 4px",background:(!val&&val!==0)?"#0f0f14":`${c}22`,border:`1.5px solid ${c}`,color:c,fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".85rem",textAlign:"center",outline:"none",borderRadius:4}}
          />
        </div>
      );
    };

    // ── Public (applied) report view ───────────────────────────────────────
    const PublishedView = ({ r }) => {
      const motm = r.players?.find(p => p.motm && p.played);
      return (
      <div style={{animation:"fadeUp .4s ease"}}>
        <div>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10,gap:8}} data-share-hide="1">
          <ShareButton
            label="SHARE RESULT"
            onShare={() => shareCard.share(
              <ResultShareCard sfcScore={r.sfcScore} oppScore={r.oppScore} opponent={r.opponent} date={r.date} motm={motm} />,
              {
                filename:"section-fc-result.png",
                caption:`SECTION FC ${r.sfcScore}–${r.oppScore} ${r.opponent}${motm?` · MOTM: ${motm.name}`:""}`,
                urlPath:SCREEN_PATHS.report,
              }
            )}
          />
          <ShareButton
            label="SHARE REPORT"
            onShare={() => shareCard.share(
              <ReportShareCard r={r} />,
              {
                filename:"section-fc-match-report.png",
                caption:`Match report: SECTION FC ${r.sfcScore}–${r.oppScore} ${r.opponent}`,
                urlPath:SCREEN_PATHS.report,
              }
            )}
          />
        </div>
        {/* Match result header */}
        <div style={{background:"#ffffff06",border:"1px solid #ffffff12",padding:"18px 16px",marginBottom:18,textAlign:"center"}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#ffffff44",marginBottom:8}}>{r.date}</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,flexWrap:"wrap"}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(1.1rem,4vw,1.6rem)",color:"#e8ff00"}}>SECTION FC</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:900,fontSize:"clamp(2rem,7vw,3rem)",color:"#fff",minWidth:36,textAlign:"center"}}>{r.sfcScore}</div>
              <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:400,fontSize:"1.2rem",color:"#ffffff30"}}>–</div>
              <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:900,fontSize:"clamp(2rem,7vw,3rem)",color:"#ff6644",minWidth:36,textAlign:"center"}}>{r.oppScore}</div>
            </div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(1.1rem,4vw,1.6rem)",color:"#ff6644"}}>{r.opponent}</div>
          </div>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:2,color:r.sfcScore>r.oppScore?"#44dd88":r.sfcScore<r.oppScore?"#ff5544":"#ffffff55",marginTop:8}}>
            {r.sfcScore>r.oppScore?"✓ WIN":r.sfcScore<r.oppScore?"✗ LOSS":"= DRAW"}
          </div>
        </div>

        {/* Player ratings & stats */}
        <div style={{marginBottom:20}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#ffffff38",marginBottom:10}}>PLAYER RATINGS & STATS</div>
          {r.players.filter(p=>p.played).map((p,i) => {
            const rc = p.rating!==undefined&&p.rating!=="" ? getRatingColor(parseFloat(p.rating)) : "#ffffff22";
            const ratingTxt = (p.rating!==""&&p.rating!=null) ? ` ${parseFloat(p.rating).toFixed(1)}` : '';
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:i%2===0?"transparent":"#ffffff04",borderBottom:"1px solid #ffffff07"}}>
                <Avatar name={p.name} size={34} />
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".88rem"}}>{p.name}</div>
                  {/* Position and the night's returns share the line under the name */}
                  <div style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap",marginTop:2}}>
                    {p.pos && <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:2,color:"#ffffff40"}}>{p.pos}</span>}
                    {p.goals>0     && <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#ffffffcc"}}>⚽ {p.goals}</span>}
                    {p.assists>0   && <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#ffffffcc"}}>🅰 {p.assists}</span>}
                    {p.yellows>0   && <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#f5c518"}}>🟨 {p.yellows}</span>}
                    {p.reds>0      && <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#ff4444"}}>🟥 {p.reds}</span>}
                    {p.cleanSheet  && <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#44dd88"}}>🧤 CS</span>}
                    {p.motm        && <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#e8ff00",fontWeight:700}}>★ MOTM</span>}
                  </div>
                </div>
                {/* Rating */}
                {p.rating!==""&&p.rating!==undefined && (
                  <div style={{width:40,height:40,borderRadius:5,background:`${rc}22`,border:`2px solid ${rc}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".88rem",color:rc}}>{parseFloat(p.rating).toFixed(1)}</span>
                  </div>
                )}
                <ShareButton
                  variant="icon"
                  size={26}
                  onShare={() => shareCard.share(
                    <PlayerRatingShareCard player={p} opponent={r.opponent} date={r.date} sfcScore={r.sfcScore} oppScore={r.oppScore} />,
                    {
                      filename:`section-fc-${firstWord(p.name).toLowerCase()}-rating.png`,
                      caption:`${p.name}${ratingTxt} vs ${r.opponent} (${r.sfcScore}–${r.oppScore})`,
                      urlPath:SCREEN_PATHS.report,
                    }
                  )}
                />
              </div>
            );
          })}
        </div>

        {/* Written report */}
        {r.reportText && (
          <div style={{background:"#ffffff05",border:"1px solid #ffffff0e",padding:"16px 18px",marginBottom:16}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#e8ff00",marginBottom:10}}>◆ MATCH REPORT</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1rem",lineHeight:1.6,color:"#ffffffcc",whiteSpace:"pre-wrap"}}>{r.reportText}</div>
          </div>
        )}

        </div>
        {isAdmin && (
          <button data-share-hide="1" className="btn btn-ghost" onClick={() => { setReportDraft({...r, applied:false}); }}
            style={{width:"100%",fontSize:".62rem",color:"#ff555588",borderColor:"#ff555533"}}>
            ✕ REOPEN FOR EDITING (will NOT reverse stat changes)
          </button>
        )}
      </div>
      );
    };

    // ── Admin editing form ─────────────────────────────────────────────────
    const EditForm = ({ d, isCorrection }) => (
      <div>
        {/* Score row */}
        <div style={{background:"#ffffff06",border:"1px solid #ffffff12",padding:"14px 16px",marginBottom:18}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#ffffff44",marginBottom:10}}>MATCH RESULT</div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <input defaultValue={d.opponent} onBlur={e=>setReportDraft(x=>({...x,opponent:e.target.value}))}
              placeholder="Opponent name…"
              style={{flex:1,minWidth:130,padding:"9px 12px",background:"#0f0f14",border:"1px solid #ffffff1e",color:"#ff6644",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".9rem",letterSpacing:1}} />
            <input defaultValue={d.date} onBlur={e=>setReportDraft(x=>({...x,date:e.target.value}))}
              placeholder="Date…"
              style={{width:130,padding:"9px 12px",background:"#0f0f14",border:"1px solid #ffffff1e",color:"#ffffffaa",fontFamily:"'Oswald',sans-serif",fontSize:".82rem"}} />
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <input type="number" min="0" defaultValue={d.sfcScore} onBlur={e=>setReportDraft(x=>({...x,sfcScore:e.target.value}))} placeholder="SFC"
                style={{width:56,padding:"9px 6px",background:"#0f0f14",border:"1px solid #e8ff0044",color:"#e8ff00",fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"1.3rem",textAlign:"center",outline:"none"}} />
              <span style={{fontFamily:"'Oswald',sans-serif",color:"#ffffff30",fontWeight:400}}>–</span>
              <input type="number" min="0" defaultValue={d.oppScore} onBlur={e=>setReportDraft(x=>({...x,oppScore:e.target.value}))} placeholder="OPP"
                style={{width:56,padding:"9px 6px",background:"#0f0f14",border:"1px solid #ff664444",color:"#ff6644",fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"1.3rem",textAlign:"center",outline:"none"}} />
            </div>
          </div>
        </div>

        {/* Player stats table */}
        <div style={{marginBottom:18}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#ffffff38",marginBottom:8}}>PLAYER RATINGS & STATS</div>
          {/* Column headers */}
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderBottom:"1px solid #ffffff0e",marginBottom:4}}>
            <div style={{minWidth:140,flex:1}} />
            <div style={{width:52,fontFamily:"'Oswald',sans-serif",fontSize:".52rem",letterSpacing:1.5,color:"#ffffff35",textAlign:"center"}}>RATING</div>
            {["G","A","Y","R"].map(h=><div key={h} style={{width:44,fontFamily:"'Oswald',sans-serif",fontSize:".52rem",letterSpacing:1.5,color:"#ffffff35",textAlign:"center"}}>{h}</div>)}
            <div style={{width:34,fontFamily:"'Oswald',sans-serif",fontSize:".52rem",letterSpacing:1.5,color:"#ffffff35",textAlign:"center"}}>CS</div>
            <div style={{width:40,fontFamily:"'Oswald',sans-serif",fontSize:".52rem",letterSpacing:1.5,color:"#e8ff0055",textAlign:"center"}}>MOTM</div>
            <div style={{width:30,fontFamily:"'Oswald',sans-serif",fontSize:".52rem",letterSpacing:1,color:"#ffffff25",textAlign:"center"}}>PLAY</div>
          </div>
          {d.players.map((p,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",background:i%2===0?"transparent":"#ffffff03",borderBottom:"1px solid #ffffff06",opacity:p.played?1:.45}}>
              <div style={{minWidth:140,flex:1,display:"flex",alignItems:"center",gap:8}}>
                <Avatar name={p.name} size={30} />
                <div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".82rem"}}>{p.name}</div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".52rem",color:"#ffffff40",letterSpacing:1}}>{p.pos}</div>
                </div>
              </div>
              <RatingInput val={p.rating} onChange={v=>updateReportPlayer(i,"rating",v)} />
              <NumInput val={p.goals}   onChange={v=>updateReportPlayer(i,"goals",v)} />
              <NumInput val={p.assists} onChange={v=>updateReportPlayer(i,"assists",v)} />
              <NumInput val={p.yellows} onChange={v=>updateReportPlayer(i,"yellows",v)} />
              <NumInput val={p.reds}    onChange={v=>updateReportPlayer(i,"reds",v)} />
              {/* Clean Sheet */}
              <button onClick={()=>updateReportPlayer(i,"cleanSheet",!p.cleanSheet)}
                style={{width:34,height:32,background:p.cleanSheet?"#44dd8822":"transparent",border:`1px solid ${p.cleanSheet?"#44dd88":"#ffffff1e"}`,color:p.cleanSheet?"#44dd88":"#ffffff30",cursor:"pointer",fontSize:".75rem",borderRadius:2}}>
                {p.cleanSheet?"✓":"–"}
              </button>
              {/* MOTM */}
              <button onClick={()=>updateReportPlayer(i,"motm",!p.motm)}
                style={{width:40,height:32,background:p.motm?"#e8ff0022":"transparent",border:`1px solid ${p.motm?"#e8ff00":"#ffffff1e"}`,color:p.motm?"#e8ff00":"#ffffff30",cursor:"pointer",fontSize:".8rem",fontFamily:"'Oswald',sans-serif",fontWeight:700,borderRadius:2}}>
                {p.motm?"★":"☆"}
              </button>
              {/* Played toggle */}
              <button onClick={()=>updateReportPlayer(i,"played",!p.played)}
                style={{width:30,height:32,background:p.played?"#ffffff0a":"transparent",border:`1px solid ${p.played?"#ffffff22":"#ffffff0e"}`,color:p.played?"#ffffffaa":"#ffffff25",cursor:"pointer",fontSize:".6rem",fontFamily:"'Oswald',sans-serif",fontWeight:700,letterSpacing:1,borderRadius:2}}>
                {p.played?"✓":"✗"}
              </button>
            </div>
          ))}
        </div>

        {/* Report text */}
        <div style={{marginBottom:18}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#ffffff38",marginBottom:8}}>WRITTEN MATCH REPORT</div>
          <textarea defaultValue={d.reportText} onBlur={e=>setReportDraft(x=>({...x,reportText:e.target.value}))}
            placeholder="Write the match report here… (optional)"
            rows={6}
            style={{width:"100%",padding:"12px 14px",background:"#0f0f14",border:"1px solid #ffffff1e",color:"#ffffffcc",fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1rem",lineHeight:1.5,resize:"vertical",outline:"none"}}
          />
        </div>

        {/* Action buttons */}
        {isCorrection ? (
          <>
            <button className="btn btn-y" onClick={saveCorrection}
              style={{width:"100%",padding:"14px",fontSize:".95rem",marginBottom:9,background:"#e8ff00",color:"#0a0a0f",letterSpacing:3}}>
              ✓ SAVE CORRECTION (score &amp; display only)
            </button>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:2,color:"#ffffff44",textAlign:"center",marginBottom:12}}>
              Stats already applied — this only updates the displayed score &amp; report
            </div>
          </>
        ) : (
          <>
            <button className="btn btn-y" onClick={applyReport} disabled={applying}
              style={{width:"100%",padding:"14px",fontSize:".95rem",marginBottom:9,background:applying?"#2a2a2a":"#00cc55",color:applying?"#555":"#0a0a0f",letterSpacing:3}}>
              {applying ? "ADDING…" : <>✓ CONFIRM &amp; ADD TO STATS</>}
            </button>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:2,color:"#ff5555aa",textAlign:"center",marginBottom:12}}>
              ⚠ Permanently adds stats to Season, All Time &amp; Player Form. Safe to press once — a repeat press is ignored.
            </div>
            <button className="btn btn-ghost" onClick={saveReportDraft} style={{width:"100%",marginBottom:6,fontSize:".72rem"}}>
              SAVE DRAFT (does not update stats)
            </button>
          </>
        )}
      </div>
    );

    return (
      <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
        <style>{CSS}</style>
        <Header {...sharedProps} />
        <main style={{padding:"22px 14px",maxWidth:860,margin:"0 auto"}}>
          <div style={{marginBottom:16}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#e8ff00",letterSpacing:4,marginBottom:5}}>◆ POST MATCH</div>
            <h1 style={{fontFamily:"'Oswald',sans-serif",fontSize:"clamp(1.6rem,5vw,2.8rem)",fontWeight:700,lineHeight:1}}>MATCH REPORT</h1>
          </div>

          {/* Published report – read-only */}
          {published && <PublishedView r={published} />}

          {/* Admin editing form */}
          {!published && isAdmin && draft && <EditForm d={draft} isCorrection={isCorrection} />}

          {/* Admin: no draft yet, but squad is available */}
          {!published && isAdmin && !draft && matchdaySquad && (
            <div style={{textAlign:"center",padding:"30px 20px"}}>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".75rem",color:"#ffffff44",letterSpacing:3,marginBottom:16}}>SQUAD FOR: {matchdaySquad.oppName}</div>
              <button className="btn btn-y" onClick={startReportFromSquad} style={{padding:"14px 32px",fontSize:".95rem",letterSpacing:3}}>
                📋 START MATCH REPORT
              </button>
            </div>
          )}

          {/* Admin: no draft, no squad */}
          {!published && isAdmin && !draft && !matchdaySquad && (
            <div style={{padding:"40px 20px",textAlign:"center",background:"#ffffff04",border:"1px solid #ffffff0a"}}>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".8rem",color:"#ffffff30",letterSpacing:2,marginBottom:8}}>NO MATCHDAY SQUAD FOUND</div>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".68rem",color:"#ffffff20",letterSpacing:1}}>Post a squad via the Matchday → Pitch screen first</div>
            </div>
          )}

          {/* Non-admin: no report */}
          {!published && !isAdmin && (
            <div style={{padding:"50px 20px",textAlign:"center",background:"#ffffff04",border:"1px solid #ffffff0a"}}>
              <div style={{fontSize:"2.5rem",marginBottom:14,opacity:.35}}>📋</div>
              <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"1rem",color:"#ffffff40",letterSpacing:3,marginBottom:8}}>NO MATCH REPORT YET</div>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#ffffff25",letterSpacing:1}}>The manager will post a report after each game</div>
            </div>
          )}

          {/* Report Archive — visible to all users, grouped by season */}
          {reportArchive.length > 0 && (() => {
            // Newest season first. Reports from before the first season on the
            // site are the Division 2 games ahead of promotion.
            const groups = [
              ...SEASONS.map(x => ({ key:x.id, label:`${x.label} · ${x.division}`, from:x.startsAt, items:[] })),
              { key:"div2", label:"Division 2", from:-Infinity, items:[] },
            ];
            reportArchive.forEach(r => groups.find(g => (r.publishedAt || 0) >= g.from).items.push(r));
            return (
              <div style={{marginTop:44,borderTop:"1px solid #ffffff0e",paddingTop:28}}>
                <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",color:"#ffffff38",letterSpacing:4,marginBottom:6}}>◆ REPORT ARCHIVE</div>
                {groups.filter(g => g.items.length).map(g => (
                  <div key={g.key}>
                    <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",margin:"18px 0 8px",paddingBottom:6,borderBottom:"1px solid #ffffff10"}}>
                      <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".72rem",letterSpacing:3,color:"#e8ff00"}}>{g.label.toUpperCase()}</div>
                      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:2,color:"#ffffff35"}}>{g.items.length} REPORT{g.items.length !== 1 ? "S" : ""}</div>
                    </div>
                    {g.items.map(r => {
                      const isExpanded = expandedArchive === r.id;
                      const won = r.sfcScore > r.oppScore;
                      const lost = r.sfcScore < r.oppScore;
                      const rc = won ? "#44dd88" : lost ? "#ff5544" : "#ffffff55";
                      return (
                        <div key={r.id} id={`report-${r.id}`} style={{marginBottom:5,scrollMarginTop:100}}>
                          <button
                            onClick={() => setExpandedArchive(isExpanded ? null : r.id)}
                            style={{width:"100%",background:isExpanded?"#ffffff08":"#ffffff04",border:`1px solid ${isExpanded?"#e8ff0033":"#ffffff0e"}`,color:"#fff",cursor:"pointer",padding:"12px 16px",display:"flex",alignItems:"center",gap:12,textAlign:"left",fontFamily:"inherit"}}
                          >
                            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".72rem",letterSpacing:2,color:rc,minWidth:16}}>{won?"W":lost?"L":"D"}</div>
                            <div style={{flex:1}}>
                              <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".85rem"}}>
                                SECTION FC {r.sfcScore}–{r.oppScore} {r.opponent}
                              </div>
                              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:2,color:"#ffffff38",marginTop:2}}>{r.date}</div>
                            </div>
                            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".65rem",color:"#ffffff28"}}>{isExpanded?"▲":"▼"}</div>
                          </button>
                          {isExpanded && (
                            <div style={{background:"#ffffff03",border:"1px solid #ffffff08",borderTop:"none",padding:"16px 18px"}}>
                              {r.reportText ? (
                                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1rem",lineHeight:1.6,color:"#ffffffcc",whiteSpace:"pre-wrap"}}>{r.reportText}</div>
                              ) : (
                                <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#ffffff25",letterSpacing:1}}>No written report.</div>
                              )}
                              {r.players?.filter(p=>p.played).length > 0 && (
                                <div style={{marginTop:12}}>
                                  {r.players.filter(p=>p.played).map((p,i) => (
                                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid #ffffff06"}}>
                                      <Avatar name={p.name} size={28} />
                                      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".78rem",flex:1}}>{p.name}</div>
                                      {p.goals>0   && <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".66rem",color:"#ffffffcc"}}>⚽ {p.goals}</span>}
                                      {p.assists>0 && <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".66rem",color:"#ffffffcc"}}>🅰 {p.assists}</span>}
                                      {p.motm && <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#e8ff00",fontWeight:700}}>★ MOTM</span>}
                                      {p.rating!==""&&p.rating!==undefined && <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".72rem",color:"#ffffff55",minWidth:24,textAlign:"right"}}>{parseFloat(p.rating).toFixed(1)}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })()}
        </main>
        {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
        {shareCard.portal}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SQUAD SCREEN (public – shows the published matchday squad)
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "squad") {
    const renderPitch = (sq) => {
      const bench = sq.benchTeam || [];
      const published = new Date(sq.publishedAt).toLocaleString("en-GB",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
      return (
        <div style={{animation:"fadeUp .4s ease"}}>
          <div data-share-hide="1" style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
            <ShareButton
              label="SHARE SQUAD"
              onShare={() => {
                const fx = squadFixture(sq);
                return shareCard.share(
                  <SquadShareCard sq={sq} fixture={fx} />,
                  {
                    filename:"section-fc-squad.png",
                    caption:`Matchday squad: SECTION FC vs ${sq.oppName}${fx ? ` — ${fx.date}${fx.time ? `, ${fx.time}` : ""}` : ""}`,
                    urlPath:SCREEN_PATHS.squad,
                  }
                );
              }}
            />
          </div>
          <div>
          <div style={{textAlign:"center",marginBottom:14}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#00cc5518",border:"1px solid #00cc5544",padding:"5px 14px",borderRadius:3,marginBottom:10}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:"#00cc55",boxShadow:"0 0 6px #00cc55"}} />
              <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#00cc55"}}>OFFICIAL SQUAD POSTED</span>
            </div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(1.2rem,4vw,2rem)",lineHeight:1.1}}>
              <span style={{color:"#e8ff00"}}>SECTION FC</span>
              <span style={{color:"#ffffff28",margin:"0 10px",fontWeight:400}}>vs</span>
              <span style={{color:"#ff6644"}}>{sq.oppName}</span>
            </div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",color:"#ffffff35",letterSpacing:2,marginTop:6}}>POSTED {published.toUpperCase()}</div>
          </div>
          <div className="pitch-in" style={{width:"100%",maxWidth:520,margin:"0 auto 12px"}}>
            <PitchSVG sTeam={sq.sTeam} oTeam={sq.oTeam} idPrefix="ps" />
          </div>
          <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:14,marginBottom:16}}>
            {[["#9eb400","#e8ff00","SECTION FC · 1-2-2"],["#aa1e00","#ff6644",`${sq.oppName} · 1-1-2-1`]]
              .map(([bg,bo,label],i) => <div key={i} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:"50%",background:bg,border:`2px solid ${bo}`}}/><span style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:1.5,color:"#ffffffaa"}}>{label}</span></div>)}
          </div>
          {/* Starters list */}
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#ffffff38",marginBottom:8}}>STARTING FIVE</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {sq.sTeam.map((p,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#e8ff0008",border:"1px solid #e8ff0018"}}>
                  <Avatar name={p.name} size={32} border="#e8ff0066" />
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".9rem",flex:1}}>{p.name}</div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".62rem",letterSpacing:2,color:"#e8ff00",padding:"2px 8px",background:"#e8ff0018",border:"1px solid #e8ff0033"}}>{p.pos}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Bench */}
          {bench.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#ffffff38",marginBottom:10}}>BENCH</div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                {bench.map((name, i) => {
                  const img = avatar(name);
                  return (
                    <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                      <div style={{width:52,height:52,borderRadius:"50%",overflow:"hidden",border:"2px dashed #e8ff0055",background:"#1a3a22",flexShrink:0}}>
                        {img
                          ? <img src={img} alt={name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                          : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".7rem",color:"#e8ff0099"}}>SUB</div>
                        }
                      </div>
                      <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".65rem",letterSpacing:1,color:"#ffffffaa"}}>{name.split(" ")[0].toUpperCase()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </div>
          {isAdmin && <SquadStatsPanel sq={sq} />}
          {isAdmin && (
            <button data-share-hide="1" className="btn btn-ghost" onClick={async () => { await clearSquad(); }}
              style={{width:"100%",marginTop:4,color:"#ff555588",borderColor:"#ff555533",fontSize:".62rem"}}>
              ✕ CLEAR PUBLISHED SQUAD
            </button>
          )}
        </div>
      );
    };

    // ── Admin-only: enter post-match stats directly from the matchday page ───
    // Writes to the same draft used by the Match Report page, so the report
    // pre-fills opponent, score, players and ratings — admin only needs to
    // add the written report there before confirming.
    const SquadStatsPanel = ({ sq }) => {
      // Only treat a draft/applied report as belonging to THIS squad — an
      // older report carrying applied:true must not block the input form
      // for a freshly-posted matchday.
      const reportIsForThisSquad =
        !!matchReport && (matchReport.squadId === sq.publishedAt);
      const draft = reportDraft
        || (reportIsForThisSquad && !matchReport.applied ? matchReport : null);
      const applied = reportIsForThisSquad && matchReport.applied && !reportDraft;
      const draftMatchesSquad =
        draft && draft.opponent === sq.oppName &&
        draft.players?.length === (sq.sTeam.length + (sq.benchTeam?.length || 0));

      const StatNumInput = ({ val, onChange, w=40 }) => (
        <input type="number" min="0" max="99" defaultValue={val}
          onBlur={e => onChange(parseInt(e.target.value)||0)}
          style={{width:w,padding:"5px 3px",background:"#0f0f14",border:"1px solid #ffffff1e",color:"#fff",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".82rem",textAlign:"center",outline:"none"}}
        />
      );
      const StatRatingInput = ({ val, onChange }) => {
        const r = parseFloat(val);
        const c = (!val && val!==0) ? "#ffffff22" : getRatingColor(r);
        return (
          <input type="number" min="0" max="10" step="0.1" defaultValue={val}
            onBlur={e => onChange(e.target.value)}
            placeholder="–"
            style={{width:50,padding:"5px 4px",background:(!val&&val!==0)?"#0f0f14":`${c}22`,border:`1.5px solid ${c}`,color:c,fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".82rem",textAlign:"center",outline:"none",borderRadius:4}}
          />
        );
      };

      if (applied) {
        return (
          <div style={{marginTop:18,padding:"14px 16px",background:"#44dd8810",border:"1px solid #44dd8833"}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:3,color:"#44dd88",marginBottom:6}}>✓ POST-MATCH STATS APPLIED</div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#ffffff66",letterSpacing:1}}>
              Stats for this match have already been added to season totals. View the full archive on the Match Report page.
            </div>
          </div>
        );
      }

      if (!draft || !draftMatchesSquad) {
        return (
          <div style={{marginTop:18,padding:"14px 16px",background:"#e8ff0008",border:"1px dashed #e8ff0044"}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:3,color:"#e8ff00",marginBottom:8}}>◆ POST-MATCH STATS (ADMIN)</div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".68rem",color:"#ffffff66",letterSpacing:1,marginBottom:12,lineHeight:1.5}}>
              After the game, add the score, ratings and player stats here. They’ll flow straight to the Match Report page so you only need to write the report and confirm.
            </div>
            <button className="btn btn-y" onClick={startReportFromSquad}
              style={{width:"100%",padding:"12px",fontSize:".82rem",letterSpacing:3}}>
              + ADD POST-MATCH STATS
            </button>
          </div>
        );
      }

      return (
        <div style={{marginTop:18,padding:"14px 12px",background:"#e8ff0008",border:"1px solid #e8ff0033"}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:3,color:"#e8ff00",marginBottom:10}}>◆ POST-MATCH STATS (ADMIN)</div>

          {/* Score */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".82rem",color:"#e8ff00",letterSpacing:1}}>SECTION FC</span>
            <input type="number" min="0" defaultValue={draft.sfcScore}
              onBlur={e=>setReportDraft(x=>({...(x||draft),sfcScore:e.target.value}))}
              style={{width:52,padding:"7px 4px",background:"#0f0f14",border:"1px solid #e8ff0044",color:"#e8ff00",fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"1.2rem",textAlign:"center",outline:"none"}} />
            <span style={{color:"#ffffff30"}}>–</span>
            <input type="number" min="0" defaultValue={draft.oppScore}
              onBlur={e=>setReportDraft(x=>({...(x||draft),oppScore:e.target.value}))}
              style={{width:52,padding:"7px 4px",background:"#0f0f14",border:"1px solid #ff664444",color:"#ff6644",fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"1.2rem",textAlign:"center",outline:"none"}} />
            <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".82rem",color:"#ff6644",letterSpacing:1}}>{draft.opponent || sq.oppName}</span>
          </div>

          {/* Headers */}
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 6px",borderBottom:"1px solid #ffffff10",marginBottom:4}}>
            <div style={{minWidth:96,flex:1,fontFamily:"'Oswald',sans-serif",fontSize:".5rem",letterSpacing:1.5,color:"#ffffff35"}}>PLAYER</div>
            <div style={{width:50,fontFamily:"'Oswald',sans-serif",fontSize:".5rem",letterSpacing:1.5,color:"#ffffff35",textAlign:"center"}}>RATING</div>
            {["G","A","Y","R"].map(h=>(
              <div key={h} style={{width:40,fontFamily:"'Oswald',sans-serif",fontSize:".5rem",letterSpacing:1.5,color:"#ffffff35",textAlign:"center"}}>{h}</div>
            ))}
            <div style={{width:30,fontFamily:"'Oswald',sans-serif",fontSize:".5rem",letterSpacing:1.5,color:"#ffffff35",textAlign:"center"}}>CS</div>
            <div style={{width:34,fontFamily:"'Oswald',sans-serif",fontSize:".5rem",letterSpacing:1.5,color:"#e8ff0055",textAlign:"center"}}>MOTM</div>
          </div>

          {draft.players.map((p,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 6px",background:i%2===0?"transparent":"#ffffff03",borderBottom:"1px solid #ffffff06",opacity:p.played?1:.45}}>
              <div style={{minWidth:96,flex:1,display:"flex",alignItems:"center",gap:7}}>
                <Avatar name={p.name} size={26} />
                <div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".74rem",lineHeight:1.1}}>{p.name}</div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".48rem",color:"#ffffff40",letterSpacing:1}}>{p.pos}</div>
                </div>
              </div>
              <StatRatingInput val={p.rating} onChange={v=>updateReportPlayer(i,"rating",v)} />
              <StatNumInput val={p.goals}   onChange={v=>updateReportPlayer(i,"goals",v)} />
              <StatNumInput val={p.assists} onChange={v=>updateReportPlayer(i,"assists",v)} />
              <StatNumInput val={p.yellows} onChange={v=>updateReportPlayer(i,"yellows",v)} />
              <StatNumInput val={p.reds}    onChange={v=>updateReportPlayer(i,"reds",v)} />
              <button onClick={()=>updateReportPlayer(i,"cleanSheet",!p.cleanSheet)}
                style={{width:30,height:30,background:p.cleanSheet?"#44dd8822":"transparent",border:`1px solid ${p.cleanSheet?"#44dd88":"#ffffff1e"}`,color:p.cleanSheet?"#44dd88":"#ffffff30",cursor:"pointer",fontSize:".7rem",borderRadius:2}}>
                {p.cleanSheet?"✓":"–"}
              </button>
              <button onClick={()=>updateReportPlayer(i,"motm",!p.motm)}
                style={{width:34,height:30,background:p.motm?"#e8ff0022":"transparent",border:`1px solid ${p.motm?"#e8ff00":"#ffffff1e"}`,color:p.motm?"#e8ff00":"#ffffff30",cursor:"pointer",fontSize:".75rem",fontFamily:"'Oswald',sans-serif",fontWeight:700,borderRadius:2}}>
                {p.motm?"★":"☆"}
              </button>
            </div>
          ))}

          {/* Written match report */}
          <div style={{marginTop:14}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:2,color:"#ffffff44",marginBottom:6}}>WRITTEN MATCH REPORT (OPTIONAL)</div>
            <textarea defaultValue={draft.reportText}
              onBlur={e=>setReportDraft(x=>({...(x||draft),reportText:e.target.value}))}
              placeholder="Match summary, key moments, team performance…"
              rows={5}
              style={{width:"100%",padding:"10px 12px",background:"#0f0f14",border:"1px solid #ffffff1e",color:"#ffffffcc",fontFamily:"'Barlow Condensed',sans-serif",fontSize:".95rem",lineHeight:1.5,resize:"vertical",outline:"none",boxSizing:"border-box"}}
            />
          </div>

          {/* One-shot apply: writes stats, ratings, score & written report
              everywhere (season, all-time, player form, team form, archive). */}
          <button className="btn btn-y" onClick={applyReport} disabled={applying}
            style={{width:"100%",marginTop:14,padding:"13px",fontSize:".82rem",letterSpacing:3,background:applying?"#2a2a2a":"#00cc55",color:applying?"#555":"#0a0a0f"}}>
            {applying ? "APPLYING…" : <>✓ CONFIRM &amp; APPLY ALL</>}
          </button>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:2,color:"#ff5555aa",textAlign:"center",marginTop:8,lineHeight:1.5}}>
            ⚠ Permanently updates Season, All Time, Player Form, Team Form &amp; archives the report. A repeat press is ignored.
          </div>
          <button className="btn btn-ghost" onClick={saveReportDraft}
            style={{width:"100%",marginTop:8,padding:"9px",fontSize:".68rem",letterSpacing:2}}>
            SAVE DRAFT (does not apply)
          </button>
        </div>
      );
    };

    return (
      <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
        <style>{CSS}</style>
        <Header {...sharedProps} />
        <main style={{padding:"22px 14px",maxWidth:560,margin:"0 auto"}}>
          <div style={{marginBottom:16}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#e8ff00",letterSpacing:4,marginBottom:5}}>◆ MATCHDAY</div>
            <h1 style={{fontFamily:"'Oswald',sans-serif",fontSize:"clamp(1.6rem,5vw,2.8rem)",fontWeight:700,lineHeight:1}}>MATCHDAY SQUAD</h1>
          </div>
          {matchdaySquad ? renderPitch(matchdaySquad) : (
            <div style={{padding:"50px 20px",textAlign:"center",background:"#ffffff04",border:"1px solid #ffffff0a"}}>
              <div style={{fontSize:"2.5rem",marginBottom:14,opacity:.4}}>⚽</div>
              <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"1rem",color:"#ffffff40",letterSpacing:3,marginBottom:8}}>NO SQUAD POSTED YET</div>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#ffffff25",letterSpacing:1}}>The manager will post the official squad before matchday</div>
            </div>
          )}
        </main>
        {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
        {shareCard.portal}
      </div>
    );
  }

  return null;
}
