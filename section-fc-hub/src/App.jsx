import { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import {
  doc, collection, onSnapshot, setDoc, updateDoc, getDoc, deleteDoc, increment
} from 'firebase/firestore';

// ── Constants ────────────────────────────────────────────────────────────────
const ADMIN_PIN = 'sfc2024'; // Change this to your own PIN

const PLAYER_IMGS = {
  "Matt Lampitt":    "/players/matt-lampitt.jpg",
  "Rohan Naal":      "/players/rohan-naal.jpg",
  "Tom Goldsby":     "/players/tom-goldsby.jpg",
  "Josh Treharne":   "/players/josh-treharne.jpg",
  "Ben Higgs":       "/players/ben-higgs.jpg",
  "Alf Little":      "/players/alf-little.jpg",
  "Jeven Dhillon":   "/players/jeven-dhillon.jpg",
  "George Mcnulty":  "/players/george-mcnulty.jpg",
  "Dani Griffiths":  "/players/dani-griffiths.jpg",
  "Hugo Hansen":     "/players/hugo-hansen.jpg",
  "Hayden Hunter":   "/players/hayden-hunter.jpg",
  "Lewis Fowler":    "/players/lewis-fowler.jpg",
  "Guy Horton":      "/players/guy-horton.jpg",
};

const LEAGUE_TABLE = [
  { pos:1, team:"SECTION FC",           pl:11, w:8, d:1, l:2, gf:75, ga:33, gd:42,  pts:25 },
  { pos:2, team:"SUICIDER TENDENCIES",  pl:11, w:8, d:1, l:2, gf:46, ga:42, gd:4,   pts:25 },
  { pos:3, team:"WSOPC FC",             pl:11, w:7, d:0, l:4, gf:38, ga:43, gd:-5,  pts:21 },
  { pos:4, team:"Kariustoglory",         pl:11, w:6, d:1, l:4, gf:55, ga:31, gd:24,  pts:19 },
  { pos:5, team:"Seymour Dodgers",      pl:11, w:4, d:1, l:6, gf:26, ga:37, gd:-11, pts:13 },
  { pos:6, team:"High Prestbury FC",    pl:11, w:4, d:0, l:7, gf:32, ga:33, gd:-1,  pts:12 },
  { pos:7, team:"Unfit 5",              pl:11, w:2, d:2, l:7, gf:37, ga:60, gd:-23, pts:8  },
  { pos:8, team:"Rio Franz Ferdinand",  pl:11, w:2, d:0, l:9, gf:30, ga:63, gd:-33, pts:6  },
];

const PAST_RESULTS = [
  { date:"Mon 6 Apr 2026", matches:[
    { home:"Unfit 5",             hg:0,  ag:5,  away:"Rio Franz Ferdinand"   },
    { home:"Kariustoglory",       hg:0,  ag:5,  away:"SUICIDER TENDENCIES"   },
    { home:"Seymour Dodgers",     hg:1,  ag:7,  away:"SECTION FC"            },
    { home:"WSOPC FC",            hg:5,  ag:0,  away:"High Prestbury FC"     },
  ]},
  { date:"Mon 30 Mar 2026", matches:[
    { home:"Seymour Dodgers",     hg:3,  ag:3,  away:"Kariustoglory"         },
    { home:"SECTION FC",          hg:10, ag:3,  away:"WSOPC FC"              },
    { home:"Rio Franz Ferdinand", hg:2,  ag:1,  away:"High Prestbury FC"     },
    { home:"SUICIDER TENDENCIES", hg:6,  ag:3,  away:"Unfit 5"               },
  ]},
  { date:"Mon 23 Mar 2026", matches:[
    { home:"Rio Franz Ferdinand", hg:2,  ag:4,  away:"SECTION FC"            },
    { home:"Kariustoglory",       hg:13, ag:4,  away:"Unfit 5"               },
    { home:"WSOPC FC",            hg:4,  ag:1,  away:"Seymour Dodgers"       },
    { home:"High Prestbury FC",   hg:2,  ag:0,  away:"SUICIDER TENDENCIES"   },
  ]},
  { date:"Mon 16 Mar 2026", matches:[
    { home:"Seymour Dodgers",     hg:5,  ag:2,  away:"Rio Franz Ferdinand"   },
    { home:"Unfit 5",             hg:0,  ag:5,  away:"High Prestbury FC"     },
    { home:"WSOPC FC",            hg:4,  ag:3,  away:"Kariustoglory"         },
    { home:"SUICIDER TENDENCIES", hg:5,  ag:4,  away:"SECTION FC"            },
  ]},
  { date:"Mon 9 Mar 2026", matches:[
    { home:"Kariustoglory",       hg:3,  ag:1,  away:"High Prestbury FC"     },
    { home:"SECTION FC",          hg:7,  ag:7,  away:"Unfit 5"               },
    { home:"Rio Franz Ferdinand", hg:2,  ag:4,  away:"WSOPC FC"              },
    { home:"SUICIDER TENDENCIES", hg:6,  ag:3,  away:"Seymour Dodgers"       },
  ]},
  { date:"Mon 2 Mar 2026", matches:[
    { home:"WSOPC FC",            hg:5,  ag:6,  away:"SUICIDER TENDENCIES"   },
    { home:"Rio Franz Ferdinand", hg:2,  ag:6,  away:"Kariustoglory"         },
    { home:"High Prestbury FC",   hg:1,  ag:4,  away:"SECTION FC"            },
    { home:"Unfit 5",             hg:0,  ag:5,  away:"Seymour Dodgers"       },
  ]},
  { date:"Mon 23 Feb 2026", matches:[
    { home:"Seymour Dodgers",     hg:2,  ag:1,  away:"High Prestbury FC"     },
    { home:"SUICIDER TENDENCIES", hg:8,  ag:5,  away:"Rio Franz Ferdinand"   },
    { home:"Unfit 5",             hg:1,  ag:3,  away:"WSOPC FC"              },
    { home:"Kariustoglory",       hg:2,  ag:3,  away:"SECTION FC"            },
  ]},
  { date:"Mon 16 Feb 2026", matches:[
    { home:"SUICIDER TENDENCIES", hg:5,  ag:3,  away:"Kariustoglory"         },
    { home:"High Prestbury FC",   hg:5,  ag:1,  away:"WSOPC FC"              },
    { home:"SECTION FC",          hg:5,  ag:2,  away:"Seymour Dodgers"       },
    { home:"Rio Franz Ferdinand", hg:6,  ag:11, away:"Unfit 5"               },
  ]},
  { date:"Mon 9 Feb 2026", matches:[
    { home:"Unfit 5",             hg:2,  ag:2,  away:"SUICIDER TENDENCIES"   },
    { home:"WSOPC FC",            hg:5,  ag:4,  away:"SECTION FC"            },
    { home:"High Prestbury FC",   hg:8,  ag:2,  away:"Rio Franz Ferdinand"   },
    { home:"Kariustoglory",       hg:7,  ag:1,  away:"Seymour Dodgers"       },
  ]},
  { date:"Mon 2 Feb 2026", matches:[
    { home:"SUICIDER TENDENCIES", hg:6,  ag:5,  away:"High Prestbury FC"     },
    { home:"Unfit 5",             hg:1,  ag:5,  away:"Kariustoglory"         },
    { home:"Seymour Dodgers",     hg:1,  ag:2,  away:"WSOPC FC"              },
    { home:"SECTION FC",          hg:14, ag:2,  away:"Rio Franz Ferdinand"   },
  ]},
  { date:"Mon 26 Jan 2026", matches:[
    { home:"High Prestbury FC",   hg:3,  ag:8,  away:"Unfit 5"               },
    { home:"SECTION FC",          hg:13, ag:3,  away:"SUICIDER TENDENCIES"   },
    { home:"Rio Franz Ferdinand", hg:0,  ag:2,  away:"Seymour Dodgers"       },
    { home:"Kariustoglory",       hg:10, ag:2,  away:"WSOPC FC"              },
  ]},
];

const FIXTURES = [
  { date:"Mon 13 Apr 2026", matches:[
    { time:"6:30 PM",  home:"High Prestbury FC",  away:"Seymour Dodgers",      pitch:"Pitch 2" },
    { time:"7:10 PM",  home:"Rio Franz Ferdinand",away:"SUICIDER TENDENCIES",  pitch:"Pitch 2" },
    { time:"7:50 PM",  home:"WSOPC FC",           away:"Unfit 5",              pitch:"Pitch 2" },
    { time:"8:30 PM",  home:"SECTION FC",         away:"VACANCY",              pitch:"Pitch 2" },
  ]},
  { date:"Mon 20 Apr 2026", matches:[
    { time:"6:30 PM",  home:"VACANCY",            away:"Rio Franz Ferdinand",  pitch:"Pitch 2" },
    { time:"7:10 PM",  home:"SECTION FC",         away:"High Prestbury FC",    pitch:"Pitch 2" },
    { time:"7:50 PM",  home:"Seymour Dodgers",    away:"Unfit 5",              pitch:"Pitch 2" },
    { time:"8:30 PM",  home:"SUICIDER TENDENCIES",away:"WSOPC FC",             pitch:"Pitch 2" },
  ]},
  { date:"Mon 27 Apr 2026", matches:[
    { time:"6:30 PM",  home:"Unfit 5",            away:"SECTION FC",           pitch:"Pitch 2" },
    { time:"7:10 PM",  home:"WSOPC FC",           away:"Rio Franz Ferdinand",  pitch:"Pitch 2" },
    { time:"7:50 PM",  home:"Seymour Dodgers",    away:"SUICIDER TENDENCIES",  pitch:"Pitch 2" },
    { time:"8:30 PM",  home:"High Prestbury FC",  away:"VACANCY",              pitch:"Pitch 2" },
  ]},
];

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
const initStats   = () => Object.fromEntries(KNOWN_PLAYERS.map(p => [p, {apps:0,goals:0,assists:0,yellows:0,reds:0,cleanSheets:0,motm:0}]));
const getRatingColor = r => r>=9.9?'#00d4ff':r>=8.8?'#22aa44':r>=7.6?'#55dd66':r>=6.6?'#cc8800':r>=5.6?'#e8d060':r>=4.6?'#ff8800':'#ff3333';
const PW=300, PH=460, BX=338;
const ptX = p => (p/100)*PW;
const ptY = p => (p/100)*PH;
const benchY = (i,t) => (PH/2)+(i-(t-1)/2)*82;
const pickRand = (arr,ex=[]) => { const p=arr.filter(x=>!ex.includes(x)); return (p.length?p:arr)[~~(Math.random()*(p.length||arr.length))]; };
const buildOpp = () => { const u=[]; return OPP_POS.map(pos=>{ const n=pickRand(OPP_POOL[pos],u); u.push(n); return {name:n,pos}; }); };
const lastWord  = n => n.split(" ").pop();
const firstWord = n => n.split(" ")[0];
const avatar    = n => PLAYER_IMGS[n] || null;
const isSFC     = t => t === "SECTION FC";
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
  body { background: #0a0a0f; color: #fff; font-family: 'Barlow Condensed', sans-serif; }
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
  ::-webkit-scrollbar { width:4px;height:4px; }
  ::-webkit-scrollbar-track { background:#0a0a0f; }
  ::-webkit-scrollbar-thumb { background:#ffffff22;border-radius:2px; }
`;

// ── Shared components ─────────────────────────────────────────────────────────
const ALL_TABS = ["home","squad","report","stats","table","fixtures","halloffame","predictor"];
const matchdayScreens = ["setup","spin","pitch"];
const TAB_LABELS = {home:"Home",squad:"⚽ Squad",report:"Report",stats:"Stats",table:"Table",fixtures:"Results",halloffame:"🏆 Hall",predictor:"Predictor"};

function Header({ screen, setScreen, isAdmin, onAdminClick }) {
  const activeTab = matchdayScreens.includes(screen) ? null : screen;
  return (
    <div style={{background:"#0a0a0f",borderBottom:"1px solid #ffffff14",position:"sticky",top:0,zIndex:20}}>
      <div style={{height:50,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div onClick={() => setScreen(isAdmin ? "setup" : "home")} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,background:"#e8ff00",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Oswald',sans-serif",fontWeight:700,color:"#0a0a0f",fontSize:".8rem",letterSpacing:1}}>SFC</div>
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

function Avatar({ name, size=38, border="#e8ff0055" }) {
  const src = avatar(name);
  if (!src) return (
    <div style={{width:size,height:size,borderRadius:"50%",background:"#ffffff15",border:"1px solid #ffffff20",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:size>30?".75rem":".55rem",color:"#ffffff55",flexShrink:0}}>
      {firstWord(name)[0]}
    </div>
  );
  return <img src={src} alt={name} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:`2px solid ${border}`,flexShrink:0}} />;
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
  const [screen, setScreen] = useState("home");
  const [loading, setLoading] = useState(true);

  // Squad / Matchday (admin only)
  const [squad,        setSquad]        = useState([...KNOWN_PLAYERS]);
  const [pIn,          setPIn]          = useState("");
  const [oIn,          setOIn]          = useState("");
  const [oppName,      setOppName]      = useState("");
  const [sTeam,        setSTeam]        = useState([]);
  const [oTeam,        setOTeam]        = useState([]);
  const [benchTeam,    setBenchTeam]    = useState([]);
  const [displays,     setDisplays]     = useState(["?","?","?","?","?"]);
  const [locked,       setLocked]       = useState([false,false,false,false,false]);
  const [spinning,     setSpinning]     = useState(false);
  const [done,         setDone]         = useState(false);
  const [swapSlot,     setSwapSlot]     = useState(-1);
  const [swapBench,    setSwapBench]    = useState(-1);

  // Published matchday squad (synced with Firestore)
  const [matchdaySquad, setMatchdaySquad] = useState(null);

  // Match report (synced with Firestore + local draft state)
  const [matchReport,  setMatchReport]  = useState(null);
  const [reportDraft,  setReportDraft]  = useState(null);

  // Stats (synced with Firestore)
  const [stats,        setStats]        = useState(initStats());
  const [sortStat,     setSortStat]     = useState("apps");
  const [editCell,     setEditCell]     = useState(null);
  const [statsTab,     setStatsTab]     = useState("season"); // "season"|"alltime"|"form"
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
  const [predFirstScorer,   setPredFirstScorer]   = useState(""); // "yes"|"no"|""
  const [predMotmPick,      setPredMotmPick]      = useState(""); // player name
  const [resultSFC,         setResultSFC]         = useState("");
  const [resultOpp,         setResultOpp]         = useState("");
  const [resultFirstScorer, setResultFirstScorer] = useState(""); // "yes"|"no"|""
  const [resultMotm,        setResultMotm]        = useState(""); // player name
  const [propResult,        setPropResult]        = useState(null); // {firstScorer:bool,motm:string}

  // Team form / dashboard
  const [teamForm,  setTeamForm]  = useState([]); // [{sfcScore,oppScore,opp,date}]
  const [clockTick, setClockTick] = useState(0);  // bumped every minute to refresh countdown

  // Home screen admin seed form
  const [showSeedForm, setShowSeedForm] = useState(false);
  const [seedInput,    setSeedInput]    = useState('');

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
        setPredMatch({ opp: d.opp||"", date: d.date||"", home: d.home||"", away: d.away||"", propPlayer: d.propPlayer||"" });
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

    // Team form (for dashboard)
    unsubs.push(onSnapshot(doc(db, "team", "form"), snap => {
      setTeamForm(snap.exists() ? (snap.data().results || []) : []);
    }));

    return () => unsubs.forEach(u => u());
  }, []);

  // Clock: tick every minute so the countdown stays live
  useEffect(() => {
    const iv = setInterval(() => setClockTick(t => t + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const closeSwaps = () => { setSwapSlot(-1); setSwapBench(-1); };

  const addPlayer = () => {
    const n = pIn.trim();
    if (!n || squad.includes(n) || squad.length >= 20) return;
    setSquad(s => [...s, n]);
    setPIn("");
  };

  const goSpin = () => {
    if (squad.length < 5 || !oIn.trim()) return;
    setOppName(oIn.trim().toUpperCase());
    setOTeam(buildOpp());
    setDisplays(["?","?","?","?","?"]);
    setLocked([false,false,false,false,false]);
    setDone(false); setSpinning(false); setSTeam([]); setBenchTeam([]); closeSwaps();
    setScreen("spin");
  };

  const spin = useCallback(() => {
    if (spinning || squad.length < 5) return;
    setSpinning(true); setDone(false); closeSwaps();
    setLocked([false,false,false,false,false]);
    setDisplays(["?","?","?","?","?"]);
    const sh = [...squad].sort(() => Math.random() - .5);
    const picks = sh.slice(0, 5);
    const team = picks.map((name, i) => ({ name, pos: SFC_POS[i] }));
    picks.forEach((fn, idx) => {
      setTimeout(() => {
        const iv = setInterval(() => setDisplays(p => { const a=[...p]; a[idx]=squad[~~(Math.random()*squad.length)]; return a; }), 65);
        setTimeout(() => {
          clearInterval(iv);
          setDisplays(p => { const a=[...p]; a[idx]=fn; return a; });
          setLocked(p => { const a=[...p]; a[idx]=true; return a; });
          if (idx === 4) { setSTeam(team); setBenchTeam(sh.slice(5,8)); setTimeout(() => { setDone(true); setSpinning(false); }, 350); }
        }, 1000);
      }, idx * 750);
    });
  }, [squad, spinning]);

  const doStarterSwap = (si, nn) => {
    const old = sTeam[si].name, bi = benchTeam.indexOf(nn);
    setSTeam(p => { const a=[...p]; a[si]={...a[si],name:nn}; return a; });
    setDisplays(p => { const a=[...p]; a[si]=nn; return a; });
    if (bi !== -1) setBenchTeam(p => { const a=[...p]; a[bi]=old; return a; });
    closeSwaps();
  };
  const doBenchSwap = (bi, nn) => { setBenchTeam(p => { const a=[...p]; a[bi]=nn; return a; }); closeSwaps(); };
  const starterOpts = si => squad.filter(p => !sTeam.some((t,i) => i!==si && t.name===p));
  const benchOpts   = bi => squad.filter(p => !sTeam.map(t=>t.name).includes(p) && !benchTeam.some((b,i) => i!==bi && b===p));

  // ── Firestore writes (admin only) ──────────────────────────────────────────
  const updateStat = async (player, key, val) => {
    const n = Math.max(0, parseInt(val) || 0);
    setStats(prev => ({ ...prev, [player]: { ...prev[player], [key]: n } }));
    await setDoc(doc(db, "stats", player), { ...stats[player], [key]: n });
  };

  const publishSquad = async () => {
    const data = {
      published: true,
      oppName,
      sTeam,
      oTeam,
      benchTeam,
      publishedAt: Date.now(),
    };
    await setDoc(doc(db, "matchday", "squad"), data);
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
    setReportDraft(null);
  };

  const applyReport = async () => {
    if (!reportDraft || reportDraft.applied) return;
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
    const final = { ...reportDraft, sfcScore: parseInt(reportDraft.sfcScore)||0, oppScore: parseInt(reportDraft.oppScore)||0, applied: true, publishedAt: Date.now() };
    await setDoc(doc(db, "matchday", "report"), final);
    setReportDraft(final);

    // Append result to team form history (keeps last 10)
    const formSnap2 = await getDoc(doc(db, "team", "form"));
    const existingForm = formSnap2.exists() ? (formSnap2.data().results || []) : [];
    const newResult = { sfcScore: final.sfcScore, oppScore: final.oppScore, opp: final.opponent, date: final.date };
    await setDoc(doc(db, "team", "form"), { results: [...existingForm, newResult].slice(-10) });
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
    const allPlayers = [
      ...(matchdaySquad?.sTeam?.map(p => p.name) || []),
      ...(matchdaySquad?.benchTeam || []),
    ];
    const propPlayer = allPlayers.length > 0
      ? allPlayers[Math.floor(Math.random() * allPlayers.length)]
      : "";
    const data = { active: true, opp: m.opp, date: m.date, home: m.home, away: m.away, predictions: [], result: null, propPlayer, propResult: null };
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
      submitted: Date.now(),
    };
    const newPreds = [...predictions.filter(p => p.player !== pred.player), pred];
    await updateDoc(doc(db, "predictor", "current"), { predictions: newPreds });
    setPredName(""); setPredSFC(""); setPredOpp("");
    setPredFirstScorer(""); setPredMotmPick("");
  };

  const revealResult = async () => {
    const r = { sfcG: parseInt(resultSFC), oppG: parseInt(resultOpp) };
    const pr = (resultFirstScorer !== "" || resultMotm !== "")
      ? { firstScorer: resultFirstScorer === "yes", motm: resultMotm }
      : null;
    const map = {};
    predictions.forEach(pred => {
      const { pts } = scorePredict(pred, r);
      let total = pts;
      if (pr) {
        if (pred.firstScorer !== "") total += ((pred.firstScorer === "yes") === pr.firstScorer) ? 1 : 0;
        if (pred.motmPick)           total += (pred.motmPick === pr.motm) ? 1 : 0;
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
  };

  const resetPredictor = async () => {
    await setDoc(doc(db, "predictor", "current"), { active: false, opp: "", date: "", home: "", away: "", predictions: [], result: null, propPlayer: "", propResult: null });
    setPredFirstScorer(""); setPredMotmPick("");
    setResultFirstScorer(""); setResultMotm("");
  };

  // ── Dashboard helpers ────────────────────────────────────────────────────────
  const parseMatchDateTime = (dateStr, timeStr) => {
    const datePart = dateStr.replace(/^\w+ /, ''); // strip "Mon "
    const [timePart, period] = timeStr.split(' ');
    let [h, m] = timePart.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return new Date(`${datePart} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  };

  const getCountdown = (match) => {
    const diff = parseMatchDateTime(match.date, match.time) - new Date();
    if (diff <= 0) return null;
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
  const allStatPlayers = [...new Set([...KNOWN_PLAYERS, ...squad])].filter(p => stats[p]);
  const sortedStats = [...allStatPlayers].sort((a,b) => (stats[b][sortStat]||0) - (stats[a][sortStat]||0));
  const sfcFixtures = FIXTURES.flatMap(gw => gw.matches.filter(m => isSFC(m.home)||isSFC(m.away)).map(m => ({...m, date:gw.date})));

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

    const lastResult = matchReport?.applied ? matchReport : null;
    const motmPlayer = lastResult?.players?.find(p => p.motm);
    const resultType = lastResult
      ? (lastResult.sfcScore > lastResult.oppScore ? 'W' : lastResult.sfcScore < lastResult.oppScore ? 'L' : 'D')
      : null;

    const sfcRow    = LEAGUE_TABLE.find(t => t.team === "SECTION FC");
    const rowAbove  = LEAGUE_TABLE.find(t => t.pos === sfcRow.pos - 1);
    const rowBelow  = LEAGUE_TABLE.find(t => t.pos === sfcRow.pos + 1);

    const last5Form  = teamForm.slice(-5);
    const formText   = getFormText(teamForm);

    const resultColor = { W:'#44dd88', D:'#e8ff00', L:'#ff4444' };

    // ── Admin: seed historical form ────────────────────────────────────────
    const seedForm = async (entries) => {
      await setDoc(doc(db, "team", "form"), { results: entries });
    };



    return (
      <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
        <style>{CSS}</style>
        <Header {...sharedProps} />
        <main style={{padding:"16px 14px",maxWidth:640,margin:"0 auto",display:"flex",flexDirection:"column",gap:12}}>

          {/* ── NEXT MATCH ── */}
          <div style={{background: isMatchDay ? "#e8ff0010" : "#ffffff06", border:`1px solid ${isMatchDay?"#e8ff0044":"#ffffff14"}`,padding:"20px 20px 18px"}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:4,color:"#ffffff40",marginBottom:10}}>
              {isMatchDay ? "⚡ MATCHDAY" : "◆ NEXT MATCH"}
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
                      {nextMatch.date} · {nextMatch.time} · {nextMatch.pitch}
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
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".8rem",color:"#ffffff30",letterSpacing:2}}>NO MORE FIXTURES</div>
            )}
          </div>

          {/* ── LAST RESULT ── */}
          {lastResult ? (
            <div style={{background:"#ffffff06",border:"1px solid #ffffff14",padding:"18px 20px"}}>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:4,color:"#ffffff40",marginBottom:10}}>◆ LAST RESULT</div>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:900,fontSize:"clamp(1.8rem,6vw,2.6rem)",color:"#fff",lineHeight:1}}>{lastResult.sfcScore}</div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:400,fontSize:"1.2rem",color:"#ffffff30"}}>–</div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:900,fontSize:"clamp(1.8rem,6vw,2.6rem)",color:"#ff6644",lineHeight:1}}>{lastResult.oppScore}</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"1rem",color:"#ff6644",lineHeight:1}}>{lastResult.opponent}</div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",color:"#ffffff40",marginTop:3}}>{lastResult.date}</div>
                </div>
                <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".7rem",letterSpacing:2,padding:"5px 12px",background:`${resultColor[resultType]}18`,border:`1px solid ${resultColor[resultType]}55`,color:resultColor[resultType]}}>
                  {resultType === 'W' ? '✓ WIN' : resultType === 'L' ? '✗ LOSS' : '= DRAW'}
                </div>
              </div>
              {/* MOTM */}
              {motmPlayer && (
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#e8ff0008",border:"1px solid #e8ff0020",marginBottom:10}}>
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
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:".9rem",color:"#ffffffaa",lineHeight:1.5,marginBottom:10}}>
                  {lastResult.reportText.length > 120 ? lastResult.reportText.slice(0,120).trimEnd() + '…' : lastResult.reportText}
                </div>
              )}
              <button onClick={() => setScreen("report")} style={{background:"none",border:"none",color:"#ffffff55",fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:2,cursor:"pointer",padding:0}}>
                READ FULL REPORT →
              </button>
            </div>
          ) : (
            <div style={{background:"#ffffff04",border:"1px solid #ffffff0a",padding:"18px 20px"}}>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:4,color:"#ffffff25",marginBottom:6}}>◆ LAST RESULT</div>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".75rem",color:"#ffffff25",letterSpacing:2}}>NO RESULT YET THIS SEASON</div>
            </div>
          )}

          {/* ── LEAGUE POSITION ── */}
          <div style={{background:"#ffffff06",border:"1px solid #ffffff14",padding:"18px 20px"}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:4,color:"#ffffff40",marginBottom:12}}>◆ LEAGUE POSITION</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {[rowAbove, sfcRow, rowBelow].filter(Boolean).map((row, i) => {
                const isSFCRow = row.team === "SECTION FC";
                return (
                  <div key={row.pos} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:isSFCRow?"#e8ff0010":"transparent",border:isSFCRow?"1px solid #e8ff0030":"1px solid transparent",borderRadius:2}}>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".75rem",width:18,color:isSFCRow?"#e8ff00":"#ffffff50",textAlign:"center"}}>{row.pos}</div>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:isSFCRow?700:400,fontSize:isSFCRow?".95rem":".85rem",flex:1,color:isSFCRow?"#fff":"#ffffffaa"}}>{row.team}</div>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".85rem",color:isSFCRow?"#e8ff00":"#ffffff50"}}>{row.pts}<span style={{fontFamily:"'Oswald',sans-serif",fontWeight:400,fontSize:".55rem",letterSpacing:1,color:"#ffffff30",marginLeft:2}}>PTS</span></div>
                  </div>
                );
              })}
            </div>
            {/* Context line */}
            <div style={{marginTop:10,fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:2,color:"#ffffff40"}}>
              {sfcRow.pos === 1
                ? (rowBelow && rowBelow.pts === sfcRow.pts ? `TOP OF TABLE ON GOAL DIFFERENCE (+${sfcRow.gd})` : `TOP OF TABLE · ${rowBelow ? sfcRow.pts - rowBelow.pts + ' PTS CLEAR' : 'UNCONTESTED'}`)
                : `${sfcRow.pos === 2 ? '1 PT' : `${(LEAGUE_TABLE[0].pts - sfcRow.pts)} PTS`} OFF TOP · GD ${sfcRow.gd > 0 ? '+' : ''}${sfcRow.gd}`
              }
            </div>
          </div>

          {/* ── FORM GUIDE ── */}
          <div style={{background:"#ffffff06",border:"1px solid #ffffff14",padding:"18px 20px"}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:4,color:"#ffffff40",marginBottom:12}}>◆ FORM GUIDE</div>
            {last5Form.length > 0 ? (
              <>
                <div style={{display:"flex",gap:6,marginBottom:10}}>
                  {last5Form.map((r,i) => {
                    const t = r.sfcScore > r.oppScore ? 'W' : r.sfcScore < r.oppScore ? 'L' : 'D';
                    return (
                      <div key={i} title={`${r.sfcScore}–${r.oppScore} vs ${r.opp}`}
                        style={{width:36,height:36,borderRadius:4,background:`${resultColor[t]}18`,border:`2px solid ${resultColor[t]}66`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"default"}}>
                        <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".85rem",color:resultColor[t]}}>{t}</span>
                      </div>
                    );
                  })}
                  {/* Empty slots up to 5 */}
                  {Array.from({length: Math.max(0, 5 - last5Form.length)}).map((_,i) => (
                    <div key={`e${i}`} style={{width:36,height:36,borderRadius:4,background:"#ffffff05",border:"1px dashed #ffffff15",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{color:"#ffffff15",fontSize:".7rem"}}>–</span>
                    </div>
                  ))}
                </div>
                {formText && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".72rem",letterSpacing:2,color:"#ffffff60"}}>{formText.toUpperCase()}</div>}
              </>
            ) : (
              <div>
                <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".72rem",color:"#ffffff25",letterSpacing:2,marginBottom:10}}>NO RESULTS LOGGED YET</div>
                {isAdmin && !showSeedForm && (
                  <button onClick={() => setShowSeedForm(true)} style={{background:"none",border:"none",color:"#ffffff35",fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:2,cursor:"pointer",padding:0}}>
                    + SEED FORM DATA
                  </button>
                )}
              </div>
            )}
            {/* Admin: seed form */}
            {isAdmin && last5Form.length > 0 && !showSeedForm && (
              <button onClick={() => setShowSeedForm(true)} style={{background:"none",border:"none",color:"#ffffff25",fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:2,cursor:"pointer",padding:0,marginTop:8}}>
                ✏️ EDIT FORM DATA
              </button>
            )}
            {isAdmin && showSeedForm && (
              <div style={{marginTop:10,padding:"12px",background:"#ffffff08",border:"1px solid #e8ff0022"}}>
                <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:3,color:"#e8ff0077",marginBottom:6}}>PASTE RESULTS — one per line: SFC-OPP OPP_NAME DATE (eg: 4-2 Seymour Mon 6 Apr)</div>
                <textarea value={seedInput} onChange={e => setSeedInput(e.target.value)} rows={5}
                  placeholder={"4-2 Seymour Dodgers Mon 6 Apr\n2-1 Unfit 5 Mon 30 Mar\n3-3 WSOPC FC Mon 23 Mar"}
                  style={{width:"100%",padding:"8px",background:"#0f0f14",border:"1px solid #ffffff1e",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontSize:".85rem",resize:"vertical",outline:"none",boxSizing:"border-box"}}
                />
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <button className="btn btn-y btn-sm" onClick={() => {
                    const entries = seedInput.trim().split('\n').filter(Boolean).map(line => {
                      const m = line.match(/^(\d+)-(\d+)\s+(.+?)\s+([\w\s]+\d{1,2}\s+\w+)$/);
                      if (!m) return null;
                      return { sfcScore: parseInt(m[1]), oppScore: parseInt(m[2]), opp: m[3].trim(), date: m[4].trim() };
                    }).filter(Boolean);
                    if (entries.length) { seedForm(entries); setShowSeedForm(false); setSeedInput(''); }
                  }}>SAVE</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowSeedForm(false); setSeedInput(''); }}>CANCEL</button>
                </div>
              </div>
            )}
          </div>

          {/* ── PREDICTION TEASER ── */}
          {(predSetup || (predResult && predictions.length > 0)) && (
            <div style={{background:"#ffffff06",border:"1px solid #ffffff14",padding:"18px 20px"}}>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:4,color:"#ffffff40",marginBottom:10}}>◆ PREDICTOR</div>
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
                  <button onClick={() => setScreen("predictor")} style={{background:"none",border:"none",color:"#ffffff35",fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:2,cursor:"pointer",padding:0,marginTop:8}}>SEE FULL LEADERBOARD →</button>
                </div>
              )}
            </div>
          )}

        </main>
        {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STATS SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "stats") {
    const StatCell = ({ player, statKey, data, updateFn }) => {
      const isEdit = isAdmin && editCell?.player === player && editCell?.stat === statKey;
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
          <button className={`stat-cell${isAdmin?" editable":""}`} onClick={() => isAdmin && setEditCell({player, stat:statKey})}>
            <span style={{color}}>{val}</span>
          </button>
        </td>
      );
    };

    const StatsTable = ({ data, updateFn }) => {
      const allP = [...new Set([...KNOWN_PLAYERS, ...squad])].filter(p => data[p]);
      const sorted = [...allP].sort((a,b) => (data[b][sortStat]||0) - (data[a][sortStat]||0));
      return (
        <div style={{overflowX:"auto"}}>
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
                        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",color:"#ffffff38",letterSpacing:1}}>#{ri+1}</div>
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
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            {playersWithForm.map((player, pi) => {
              const games = playerFormData[player]?.games || [];
              const isAdding = addingFormGame === player;
              return (
                <div key={player} style={{background:pi%2===0?"transparent":"#ffffff03",borderBottom:"1px solid #ffffff08",padding:"10px 8px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                    <div style={{display:"flex",alignItems:"center",gap:9,minWidth:155,flexShrink:0}}>
                      <Avatar name={player} size={36} />
                      <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".88rem"}}>{player}</div>
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
                          <div key={gi} onClick={() => isAdmin && setEditFormCell({player,idx:gi})}
                            style={{width:44,height:44,borderRadius:6,background:`${c}22`,border:`2px solid ${c}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",cursor:isAdmin?"pointer":"default",transition:"opacity .15s"}}>
                            <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".88rem",color:c,lineHeight:1}}>{parseFloat(game.rating).toFixed(1)}</span>
                            {game.opp && <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".38rem",color:"#ffffffaa",lineHeight:1.3,maxWidth:40,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{game.opp}</span>}
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
          <div style={{display:"flex",borderBottom:"1px solid #ffffff14",marginBottom:18}}>
            {[["season","Season Stats"],["alltime","All Time Stats"],["form","Player Form"]].map(([key,label]) => (
              <button key={key} onClick={() => { setStatsTab(key); setEditCell(null); setEditFormCell(null); setAddingFormGame(null); }}
                style={{background:"transparent",border:"none",borderBottom:`2px solid ${statsTab===key?"#e8ff00":"transparent"}`,
                  color:statsTab===key?"#e8ff00":"#ffffff55",padding:"10px 16px",cursor:"pointer",marginBottom:-1,
                  fontFamily:"'Oswald',sans-serif",fontWeight:600,fontSize:".68rem",letterSpacing:2,
                  textTransform:"uppercase",transition:"all .15s",whiteSpace:"nowrap"}}
              >{label}</button>
            ))}
          </div>
          {statsTab === "season" && (
            <>
              {isAdmin && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".56rem",letterSpacing:3,color:"#ffffff35",marginBottom:9}}>CLICK ANY STAT TO EDIT · CLICK HEADER TO SORT</div>}
              <StatsTable data={stats} updateFn={updateStat} />
            </>
          )}
          {statsTab === "alltime" && (
            <>
              {isAdmin && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".56rem",letterSpacing:3,color:"#ffffff35",marginBottom:9}}>CLICK ANY STAT TO EDIT · CLICK HEADER TO SORT</div>}
              <StatsTable data={allTimeStats} updateFn={updateAllTimeStat} />
            </>
          )}
          {statsTab === "form" && <PlayerFormView />}
        </main>
        {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TABLE SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "table") return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
      <style>{CSS}</style>
      <Header {...sharedProps} />
      <main style={{padding:"22px 14px",maxWidth:700,margin:"0 auto"}}>
        <div style={{marginBottom:18}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#e8ff00",letterSpacing:4,marginBottom:5}}>◆ LEAGUE STANDINGS</div>
          <h1 style={{fontFamily:"'Oswald',sans-serif",fontSize:"clamp(1.6rem,5vw,2.8rem)",fontWeight:700,lineHeight:1}}>POWERLEAGUE TABLE</h1>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:420}}>
            <thead>
              <tr style={{borderBottom:"2px solid #ffffff20"}}>
                {["#","TEAM","PL","W","D","L","GF","GA","GD","PTS"].map((h,i) => (
                  <th key={i} style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:2,color:"#ffffff44",fontWeight:600,padding:"9px 6px",textAlign:i<2?"left":"center",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LEAGUE_TABLE.map((row, i) => {
                const sfc = isSFC(row.team);
                return (
                  <tr key={i} style={{borderBottom:`1px solid ${sfc?"#e8ff0025":"#ffffff08"}`,background:sfc?"#e8ff0008":i%2===0?"transparent":"#ffffff02"}}>
                    <td style={{padding:"11px 6px",textAlign:"center"}}>
                      <div style={{width:22,height:22,borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".75rem",background:row.pos<=2?"#e8ff00":"transparent",color:row.pos<=2?"#0a0a0f":"#ffffffcc"}}>{row.pos}</div>
                    </td>
                    <td style={{padding:"11px 6px",fontFamily:"'Oswald',sans-serif",fontWeight:sfc?700:500,fontSize:".9rem",color:sfc?"#e8ff00":"#ffffffcc",whiteSpace:"nowrap"}}>
                      {sfc && <span style={{marginRight:5}}>★</span>}{row.team}
                    </td>
                    {[row.pl,row.w,row.d,row.l,row.gf,row.ga].map((v,j) => (
                      <td key={j} style={{padding:"11px 5px",textAlign:"center",fontFamily:"'Oswald',sans-serif",fontWeight:500,fontSize:".88rem",color:"#ffffffaa"}}>{v}</td>
                    ))}
                    <td style={{padding:"11px 5px",textAlign:"center",fontFamily:"'Oswald',sans-serif",fontWeight:600,fontSize:".88rem",color:row.gd>0?"#44dd88":row.gd<0?"#ff6644":"#ffffffaa"}}>{row.gd>0?"+":""}{row.gd}</td>
                    <td style={{padding:"11px 5px",textAlign:"center",fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".95rem",color:sfc?"#e8ff00":"#fff"}}>{row.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
      {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // FIXTURES SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "fixtures") return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
      <style>{CSS}</style>
      <Header {...sharedProps} />
      <main style={{padding:"22px 14px",maxWidth:680,margin:"0 auto"}}>

        {/* ── Upcoming Fixtures ── */}
        <div style={{marginBottom:20}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#e8ff00",letterSpacing:4,marginBottom:5}}>◆ UPCOMING FIXTURES</div>
          <h1 style={{fontFamily:"'Oswald',sans-serif",fontSize:"clamp(1.6rem,5vw,2.8rem)",fontWeight:700,lineHeight:1}}>FIXTURES & RESULTS</h1>
        </div>
        {FIXTURES.map((gw, gi) => (
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
                  <div style={{width:52,textAlign:"right",fontFamily:"'Oswald',sans-serif",fontSize:".58rem",color:"#ffffff25",flexShrink:0}}>{m.pitch}</div>
                </div>
              );
            })}
          </div>
        ))}

        {/* ── Past Results ── */}
        <div style={{marginTop:36,marginBottom:20,paddingTop:28,borderTop:"1px solid #ffffff12"}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#e8ff00",letterSpacing:4,marginBottom:5}}>◆ PAST RESULTS</div>
          <h2 style={{fontFamily:"'Oswald',sans-serif",fontSize:"clamp(1.3rem,4vw,2rem)",fontWeight:700,lineHeight:1,color:"#fff"}}>RESULTS</h2>
        </div>
        {PAST_RESULTS.map((gw, gi) => (
          <div key={gi} style={{marginBottom:24,animation:"fadeUp .4s ease both",animationDelay:`${gi*.05}s`}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".75rem",letterSpacing:3,color:"#ffffff55",marginBottom:10,paddingBottom:8,borderBottom:"1px solid #ffffff1a"}}>{gw.date}</div>
            {gw.matches.map((m, mi) => {
              const sfcGame = isSFC(m.home) || isSFC(m.away);
              const sfcWon  = sfcGame && (isSFC(m.home) ? m.hg > m.ag : m.ag > m.hg);
              const sfcDraw = sfcGame && m.hg === m.ag;
              const sfcLost = sfcGame && !sfcWon && !sfcDraw;
              const badge   = sfcWon ? {label:"W",bg:"#22aa44"} : sfcDraw ? {label:"D",bg:"#cc8800"} : sfcLost ? {label:"L",bg:"#cc3333"} : null;
              return (
                <div key={mi} style={{display:"flex",alignItems:"center",background:sfcGame?"#e8ff0008":"#ffffff04",border:`1px solid ${sfcGame?"#e8ff0020":"#ffffff0a"}`,padding:"9px 12px",marginBottom:5}}>
                  {badge && (
                    <div style={{width:22,height:22,background:badge.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".65rem",color:"#fff",flexShrink:0,marginRight:8,letterSpacing:0}}>{badge.label}</div>
                  )}
                  {!badge && <div style={{width:22,marginRight:8,flexShrink:0}} />}
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <div style={{flex:1,textAlign:"right",fontFamily:"'Oswald',sans-serif",fontWeight:isSFC(m.home)?700:400,fontSize:".88rem",color:isSFC(m.home)?"#e8ff00":"#ffffffaa"}}>{m.home}</div>
                    <div style={{display:"flex",gap:3,flexShrink:0}}>
                      <div style={{width:26,height:26,background:"#1a1a22",border:"1px solid #ffffff18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".85rem",color:isSFC(m.home)?"#e8ff00":"#fff"}}>{m.hg}</div>
                      <div style={{width:26,height:26,background:"#1a1a22",border:"1px solid #ffffff18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".85rem",color:isSFC(m.away)?"#e8ff00":"#fff"}}>{m.ag}</div>
                    </div>
                    <div style={{flex:1,fontFamily:"'Oswald',sans-serif",fontWeight:isSFC(m.away)?700:400,fontSize:".88rem",color:isSFC(m.away)?"#e8ff00":"#ffffffaa"}}>{m.away}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      </main>
      {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
    </div>
  );

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
          <div style={{position:"relative",background:`radial-gradient(ellipse at 50% 40%, ${aw.glow}, transparent 70%)`,borderRadius:12,border:`1px solid ${aw.color}33`,padding:"28px 20px 22px",textAlign:"center"}}>
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
                <div style={{marginTop:16}}>
                  <select value={winner||""} onChange={e => saveAward(aw.id, e.target.value)} style={{width:"100%",marginBottom:10}}>
                    <option value="">— Remove winner —</option>
                    {allForSelect.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button className="btn btn-y" onClick={() => setEditingAwards(false)} style={{width:"100%",padding:"10px"}}>DONE ✓</button>
                </div>
              ) : (
                <button className="btn btn-ghost" onClick={() => setEditingAwards(true)} style={{marginTop:14}}>✏️ ASSIGN WINNER</button>
              )
            )}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:12}}>
            <button className="btn btn-ghost" onClick={() => { setActiveAward(i => (i-1+AWARDS.length)%AWARDS.length); setEditingAwards(false); }}>← PREV</button>
            <span style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#ffffff30",letterSpacing:2,alignSelf:"center"}}>{activeAward+1} / {AWARDS.length}</span>
            <button className="btn btn-ghost" onClick={() => { setActiveAward(i => (i+1)%AWARDS.length); setEditingAwards(false); }}>NEXT →</button>
          </div>
        </div>
        {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
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

        {predSetup && (
          <>
            {/* Active match banner */}
            <div style={{background:"#e8ff0010",border:"1px solid #e8ff0033",padding:"14px 16px",marginBottom:18}}>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#e8ff0088",marginBottom:5}}>PREDICT THIS MATCH</div>
              <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:"clamp(1.1rem,4vw,1.6rem)"}}>
                SECTION FC <span style={{color:"#ffffff40",fontSize:".8em"}}>vs</span> {predMatch.opp==="VACANCY"?"TBD":predMatch.opp}
              </div>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#ffffff44",letterSpacing:2,marginTop:3}}>{predMatch.date}</div>
              {isAdmin && !predResult && <button className="btn btn-ghost" onClick={resetPredictor} style={{marginTop:10,fontSize:".6rem"}}>✕ CLOSE PREDICTIONS</button>}
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

                {/* Prop Bet 1: First Scorer */}
                {predMatch.propPlayer && (
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

                {/* Prop Bet 2: MOTM */}
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
                    ? (p.firstScorer!==""&&p.firstScorer!==undefined ? ((p.firstScorer==="yes")===propResult.firstScorer?1:0) : 0)
                      + (p.motmPick ? (p.motmPick===propResult.motm?1:0) : 0)
                    : 0;
                  const totalPts = (scoreRes?.pts||0) + propPts;
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:totalPts>=3?"#e8ff0012":totalPts>=1?"#ffffff0a":"#ffffff06",border:`1px solid ${totalPts>=3?"#e8ff0044":totalPts>=1?"#ffffff18":"#ffffff0d"}`,marginBottom:4}}>
                      <Avatar name={p.player} size={28} />
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:600,fontSize:".88rem"}}>{p.player}</div>
                        {predMatch.propPlayer && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",color:"#ffffff35",letterSpacing:.5,marginTop:2}}>{p.firstScorer?"First scorer: "+p.firstScorer.toUpperCase():""}{p.firstScorer&&p.motmPick?" · ":""}{p.motmPick?"MOTM: "+firstWord(p.motmPick):""}</div>}
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
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:predMatch.propPlayer||squadPlayers.length>0?14:0}}>
                      <input type="number" min="0" max="20" value={resultSFC} onChange={e => setResultSFC(e.target.value)} placeholder="SFC" style={{flex:1,padding:"12px",background:"#ffffff0d",border:"1px solid #e8ff0044",color:"#fff",fontFamily:"'Oswald',sans-serif",fontSize:"1.4rem",fontWeight:700,textAlign:"center"}} />
                      <span style={{color:"#ffffff30",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"1.2rem"}}>–</span>
                      <input type="number" min="0" max="20" value={resultOpp} onChange={e => setResultOpp(e.target.value)} placeholder="OPP" style={{flex:1,padding:"12px",background:"#ffffff0d",border:"1px solid #ff775544",color:"#fff",fontFamily:"'Oswald',sans-serif",fontSize:"1.4rem",fontWeight:700,textAlign:"center"}} />
                    </div>
                    {predMatch.propPlayer && (
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
        )}

        {/* Season Leaderboard */}
        {seasonPreds.length > 0 && (
          <div style={{marginTop:8}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:3,color:"#e8ff00",marginBottom:10,paddingTop:14,borderTop:"1px solid #ffffff0e"}}>🏆 SEASON LEADERBOARD</div>
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
        )}
      </main>
      {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN ONLY: SETUP / SPIN / PITCH
  // ══════════════════════════════════════════════════════════════════════════
  if (!isAdmin) return null;

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
                <button onClick={() => setSquad(s => s.filter(x => x!==p))} style={{background:"none",border:"none",color:"#ff5555",cursor:"pointer",fontSize:".75rem",padding:0}}>✕</button>
              </div>
            ))}
          </div>
        </section>
        <section style={{marginBottom:28}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",letterSpacing:3,color:"#fff6",marginBottom:9}}>THIS WEEK'S OPPONENT</div>
          <input value={oIn} onChange={e => setOIn(e.target.value)} onKeyDown={e => e.key==="Enter"&&goSpin()} placeholder="Opponent team name…" style={{width:"100%",padding:"12px 14px",background:"#ffffff0d",border:"1px solid #ffffff1e",color:"#fff",fontFamily:"'Oswald',sans-serif",fontSize:".9rem",letterSpacing:1}} />
        </section>
        <button className="btn btn-y" onClick={goSpin} disabled={squad.length<5||!oIn.trim()} style={{width:"100%",padding:"14px",fontSize:"1rem"}}>CONTINUE TO RANDOMISER →</button>
      </main>
      {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
    </div>
  );

  if (screen === "spin") return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
      <style>{CSS}</style>
      <Header {...sharedProps} />
      <main style={{maxWidth:520,margin:"0 auto",padding:"24px 16px"}}>
        <div style={{textAlign:"center",marginBottom:18}}>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".62rem",color:"#e8ff00",letterSpacing:4,marginBottom:6}}>◆ TEAM PICKER</div>
          <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(1.1rem,4vw,1.7rem)"}}>
            <span style={{color:"#e8ff00"}}>SECTION FC</span><span style={{color:"#ffffff28",margin:"0 10px"}}>vs</span><span style={{color:"#ff7755"}}>{oppName}</span>
          </div>
        </div>
        {done && benchTeam.length > 0 && (
          <div style={{marginBottom:12,animation:"fadeUp .3s ease"}}>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#ffffff38",marginBottom:7}}>BENCH</div>
            {benchTeam.map((name, bi) => {
              const isOpen = swapBench===bi;
              return (
                <div key={bi}>
                  <div style={{display:"flex",alignItems:"center",background:isOpen?"#e8ff0010":"#ffffff06",border:`1px solid ${isOpen?"#e8ff0044":"#ffffff0d"}`,padding:"8px 12px",gap:9,marginBottom:4,transition:"all .2s"}}>
                    <Avatar name={name} size={30} />
                    <div style={{width:36,fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".6rem",letterSpacing:2,color:"#e8ff0055"}}>SUB</div>
                    <div style={{flex:1,fontFamily:"'Oswald',sans-serif",fontWeight:600,fontSize:".95rem",color:"#ffffffaa"}}>{name}</div>
                    <button onClick={() => isOpen ? closeSwaps() : setSwapBench(bi)} style={{background:isOpen?"#e8ff00":"transparent",border:`1px solid ${isOpen?"#e8ff00":"#ffffff25"}`,color:isOpen?"#0a0a0f":"#ffffff88",padding:"4px 9px",cursor:"pointer",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".6rem",letterSpacing:1.5,transition:"all .15s"}}>{isOpen?"✕":"⇄"}</button>
                  </div>
                  {isOpen && (
                    <div style={{background:"#0f0f14",border:"1px solid #e8ff0028",borderTop:"none",padding:"10px 12px",marginBottom:4}}>
                      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".56rem",letterSpacing:3,color:"#e8ff0077",marginBottom:7}}>REPLACE BENCH SLOT</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{benchOpts(bi).map(n => <button key={n} className="swap-opt" onClick={() => doBenchSwap(bi, n)}><Avatar name={n} size={18}/>{n}</button>)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:20}}>
          {SFC_POS.map((pos, i) => {
            const isOpen = swapSlot===i, lkd = locked[i], dn = displays[i];
            return (
              <div key={i}>
                <div className={!lkd&&spinning?"slot-spin":lkd&&!isOpen?"slot-lock":""} style={{display:"flex",alignItems:"center",background:isOpen?"#e8ff0018":lkd?"#e8ff0010":"#ffffff07",border:`1px solid ${isOpen?"#e8ff00":lkd?"#e8ff0066":"#ffffff13"}`,padding:"11px 12px",gap:9,transition:"all .2s"}}>
                  {lkd ? <Avatar name={dn} size={34} /> : <div style={{width:34,height:34,borderRadius:"50%",background:"#ffffff0a",border:"1px dashed #ffffff18",flexShrink:0}} />}
                  <div style={{width:42,fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".68rem",letterSpacing:2,color:lkd?"#e8ff00":"#ffffff40"}}>{pos}</div>
                  <div style={{flex:1,fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:"clamp(.9rem,3.5vw,1.3rem)",color:lkd?"#fff":spinning?"#ffffff55":"#ffffff22",transition:"color .2s"}}>{dn}</div>
                  <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                    {lkd && !isOpen && <span style={{color:"#e8ff00"}}>✓</span>}
                    {done && <button onClick={() => isOpen ? closeSwaps() : setSwapSlot(i)} style={{background:isOpen?"#e8ff00":"transparent",border:`1px solid ${isOpen?"#e8ff00":"#ffffff30"}`,color:isOpen?"#0a0a0f":"#ffffffaa",padding:"4px 9px",cursor:"pointer",fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".62rem",letterSpacing:1.5,transition:"all .15s"}}>{isOpen?"✕":"⇄"}</button>}
                  </div>
                </div>
                {isOpen && (
                  <div style={{background:"#0f0f14",border:"1px solid #e8ff0033",borderTop:"none",padding:"10px 12px"}}>
                    <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".56rem",letterSpacing:3,color:"#e8ff0088",marginBottom:7}}>SWAP {pos}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{starterOpts(i).map(n => <button key={n} className="swap-opt" onClick={() => doStarterSwap(i, n)}><Avatar name={n} size={18}/>{n}{benchTeam.includes(n)?" ↑":""}</button>)}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {done ? (
            <>
              <button className="btn btn-y" onClick={() => setScreen("pitch")} style={{width:"100%",padding:"13px",fontSize:"1rem",animation:"glow 1.8s infinite"}}>VIEW ON PITCH →</button>
              <button className="btn btn-o" onClick={spin} style={{width:"100%"}}>↺ FULL RESPIN</button>
            </>
          ) : (
            <button className="btn btn-y" onClick={spin} disabled={spinning} style={{width:"100%",padding:"13px",fontSize:"1rem"}}>{spinning?"PICKING…":sTeam.length>0?"↺ RESPIN":"🎲 PICK TEAM"}</button>
          )}
        </div>
      </main>
      {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
    </div>
  );

  if (screen === "pitch") {
    const sfcP = sTeam.map((p,i) => ({...p, x:SFC_XY[i][0], y:SFC_XY[i][1], img:avatar(p.name)}));
    const oppP = oTeam.map((p,i) => ({...p, x:OPP_XY[i][0], y:OPP_XY[i][1]}));
    const vbW = benchTeam.length > 0 ? PW+68 : PW;
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
            <svg viewBox={`0 0 ${vbW} ${PH}`} style={{width:"100%",display:"block",borderRadius:6}}>
              <defs>
                {sfcP.map((_,i) => <clipPath key={i} id={`cs${i}`}><circle cx={ptX(sfcP[i].x)} cy={ptY(sfcP[i].y)} r={17}/></clipPath>)}
                {benchTeam.map((_,i) => <clipPath key={i} id={`cb${i}`}><circle cx={BX} cy={benchY(i,benchTeam.length)} r={14}/></clipPath>)}
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
              {sfcP.map((p,i) => { const cx=ptX(p.x),cy=ptY(p.y); return (<g key={`s${i}`}><circle cx={cx} cy={cy} r={17} fill="#9eb400" stroke="#e8ff00" strokeWidth={2.5}/>{p.img?<image href={p.img} x={cx-17} y={cy-17} width={34} height={34} clipPath={`url(#cs${i})`} preserveAspectRatio="xMidYMid slice"/>:<text x={cx} y={cy+.5} textAnchor="middle" dominantBaseline="middle" fill="#0a0a0f" fontSize={8} fontWeight="bold" fontFamily="sans-serif">{p.pos}</text>}<rect x={cx-27} y={cy+19} width={54} height={13} rx={2} fill="rgba(0,0,0,.72)"/><text x={cx} y={cy+26} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={7} fontFamily="sans-serif">{firstWord(p.name)}</text></g>); })}
              {benchTeam.length>0 && <>
                <line x1={PW+8} y1={20} x2={PW+8} y2={PH-20} stroke="rgba(255,255,255,.12)" strokeWidth={1} strokeDasharray="4 4"/>
                <text transform={`rotate(-90,${BX},${PH/2})`} x={BX} y={PH/2} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,.18)" fontSize={7} fontFamily="sans-serif" fontWeight="bold" letterSpacing={3}>BENCH</text>
                {benchTeam.map((name,i) => { const cy=benchY(i,benchTeam.length),img=avatar(name); return (<g key={`b${i}`}><circle cx={BX} cy={cy} r={14} fill="#1a3a22" stroke="#e8ff0055" strokeWidth={1.5} strokeDasharray="3 2"/>{img?<image href={img} x={BX-14} y={cy-14} width={28} height={28} clipPath={`url(#cb${i})`} preserveAspectRatio="xMidYMid slice"/>:<text x={BX} y={cy+.5} textAnchor="middle" dominantBaseline="middle" fill="#e8ff0099" fontSize={7} fontWeight="bold" fontFamily="sans-serif">SUB</text>}<rect x={BX-24} y={cy+16} width={48} height={12} rx={2} fill="rgba(0,0,0,.6)"/><text x={BX} y={cy+22} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,.8)" fontSize={6.5} fontFamily="sans-serif">{firstWord(name)}</text></g>); })}
              </>}
            </svg>
          </div>
          <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:14,marginBottom:12}}>
            {[["#9eb400","#e8ff00","SECTION FC · 1-2-2"],["#aa1e00","#ff6644",`${oppName} · 1-1-2-1`],...(benchTeam.length>0?[["#1a3a22","#e8ff0055","BENCH"]]:[])]
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
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MATCH REPORT SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "report") {
    // Determine which data to show in editing form
    const draft = reportDraft || (matchReport && !matchReport.applied ? matchReport : null);
    const published = (matchReport?.applied && !reportDraft) ? matchReport : null;
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
    const PublishedView = ({ r }) => (
      <div style={{animation:"fadeUp .4s ease"}}>
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
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:i%2===0?"transparent":"#ffffff04",borderBottom:"1px solid #ffffff07",flexWrap:"wrap"}}>
                <Avatar name={p.name} size={34} />
                <div style={{minWidth:130,flex:1}}>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontWeight:700,fontSize:".88rem"}}>{p.name}</div>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".55rem",letterSpacing:2,color:"#ffffff40"}}>{p.pos}</div>
                </div>
                {/* Rating */}
                {p.rating!==""&&p.rating!==undefined && (
                  <div style={{width:40,height:40,borderRadius:5,background:`${rc}22`,border:`2px solid ${rc}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:800,fontSize:".88rem",color:rc}}>{parseFloat(p.rating).toFixed(1)}</span>
                  </div>
                )}
                {/* Stats */}
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {p.goals>0     && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#ffffffcc"}}>⚽ {p.goals}</div>}
                  {p.assists>0   && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#ffffffcc"}}>🅰 {p.assists}</div>}
                  {p.yellows>0   && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#f5c518"}}>🟨 {p.yellows}</div>}
                  {p.reds>0      && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#ff4444"}}>🟥 {p.reds}</div>}
                  {p.cleanSheet  && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#44dd88"}}>🧤 CS</div>}
                  {p.motm        && <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".7rem",color:"#e8ff00",fontWeight:700}}>★ MOTM</div>}
                </div>
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

        {isAdmin && (
          <button className="btn btn-ghost" onClick={() => { setReportDraft({...r, applied:false}); }}
            style={{width:"100%",fontSize:".62rem",color:"#ff555588",borderColor:"#ff555533"}}>
            ✕ REOPEN FOR EDITING (will NOT reverse stat changes)
          </button>
        )}
      </div>
    );

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
            <button className="btn btn-y" onClick={applyReport}
              style={{width:"100%",padding:"14px",fontSize:".95rem",marginBottom:9,background:"#00cc55",color:"#0a0a0f",letterSpacing:3}}>
              ✓ CONFIRM &amp; ADD TO STATS
            </button>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".58rem",letterSpacing:2,color:"#ff5555aa",textAlign:"center",marginBottom:12}}>
              ⚠ This permanently adds stats to Season, All Time &amp; Player Form — only press once
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
        </main>
        {showPinModal && <AdminModal isAdmin={isAdmin} onClose={() => setShowPinModal(false)} onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SQUAD SCREEN (public – shows the published matchday squad)
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "squad") {
    const renderPitch = (sq) => {
      const sfcP = sq.sTeam.map((p,i) => ({...p, x:SFC_XY[i][0], y:SFC_XY[i][1], img:avatar(p.name)}));
      const oppP = sq.oTeam.map((p,i) => ({...p, x:OPP_XY[i][0], y:OPP_XY[i][1]}));
      const bench = sq.benchTeam || [];
      const vbW = bench.length > 0 ? PW+68 : PW;
      const published = new Date(sq.publishedAt).toLocaleString("en-GB",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
      return (
        <div style={{animation:"fadeUp .4s ease"}}>
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
            <svg viewBox={`0 0 ${vbW} ${PH}`} style={{width:"100%",display:"block",borderRadius:6}}>
              <defs>
                {sfcP.map((_,i) => <clipPath key={i} id={`ps${i}`}><circle cx={ptX(sfcP[i].x)} cy={ptY(sfcP[i].y)} r={17}/></clipPath>)}
                {bench.map((_,i) => <clipPath key={i} id={`pb${i}`}><circle cx={BX} cy={benchY(i,bench.length)} r={14}/></clipPath>)}
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
              {sfcP.map((p,i) => { const cx=ptX(p.x),cy=ptY(p.y); return (<g key={`s${i}`}><circle cx={cx} cy={cy} r={17} fill="#9eb400" stroke="#e8ff00" strokeWidth={2.5}/>{p.img?<image href={p.img} x={cx-17} y={cy-17} width={34} height={34} clipPath={`url(#ps${i})`} preserveAspectRatio="xMidYMid slice"/>:<text x={cx} y={cy+.5} textAnchor="middle" dominantBaseline="middle" fill="#0a0a0f" fontSize={8} fontWeight="bold" fontFamily="sans-serif">{p.pos}</text>}<rect x={cx-27} y={cy+19} width={54} height={13} rx={2} fill="rgba(0,0,0,.72)"/><text x={cx} y={cy+26} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={7} fontFamily="sans-serif">{firstWord(p.name)}</text></g>); })}
              {bench.length>0 && <>
                <line x1={PW+8} y1={20} x2={PW+8} y2={PH-20} stroke="rgba(255,255,255,.12)" strokeWidth={1} strokeDasharray="4 4"/>
                <text transform={`rotate(-90,${BX},${PH/2})`} x={BX} y={PH/2} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,.18)" fontSize={7} fontFamily="sans-serif" fontWeight="bold" letterSpacing={3}>BENCH</text>
                {bench.map((name,i) => { const cy=benchY(i,bench.length),img=avatar(name); return (<g key={`b${i}`}><circle cx={BX} cy={cy} r={14} fill="#1a3a22" stroke="#e8ff0055" strokeWidth={1.5} strokeDasharray="3 2"/>{img?<image href={img} x={BX-14} y={cy-14} width={28} height={28} clipPath={`url(#pb${i})`} preserveAspectRatio="xMidYMid slice"/>:<text x={BX} y={cy+.5} textAnchor="middle" dominantBaseline="middle" fill="#e8ff0099" fontSize={7} fontWeight="bold" fontFamily="sans-serif">SUB</text>}<rect x={BX-24} y={cy+16} width={48} height={12} rx={2} fill="rgba(0,0,0,.6)"/><text x={BX} y={cy+22} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,.8)" fontSize={6.5} fontFamily="sans-serif">{firstWord(name)}</text></g>); })}
              </>}
            </svg>
          </div>
          <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:14,marginBottom:16}}>
            {[["#9eb400","#e8ff00","SECTION FC · 1-2-2"],["#aa1e00","#ff6644",`${sq.oppName} · 1-1-2-1`],...(bench.length>0?[["#1a3a22","#e8ff0055","BENCH"]]:[])]
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
          {/* Bench list */}
          {bench.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"'Oswald',sans-serif",fontSize:".6rem",letterSpacing:3,color:"#ffffff38",marginBottom:8}}>BENCH</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {bench.map((name,i) => (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",background:"#ffffff06",border:"1px solid #ffffff12"}}>
                    <Avatar name={name} size={28} border="#ffffff33" />
                    <span style={{fontFamily:"'Oswald',sans-serif",fontWeight:600,fontSize:".85rem",color:"#ffffffaa"}}>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isAdmin && (
            <button className="btn btn-ghost" onClick={async () => { await clearSquad(); }}
              style={{width:"100%",marginTop:4,color:"#ff555588",borderColor:"#ff555533",fontSize:".62rem"}}>
              ✕ CLEAR PUBLISHED SQUAD
            </button>
          )}
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
      </div>
    );
  }

  return null;
}
