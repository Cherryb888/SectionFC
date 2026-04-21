import { useEffect, useRef, useState } from 'react';

export const SQUAD = [
  "Matt Lampitt", "Rohan Naal", "Tom Goldsby", "Josh Treharne",
  "Ben Higgs", "Jeven Dhillon", "George Mcnulty", "Dani Griffiths",
  "Hugo Hansen", "Hayden Hunter", "Lewis Fowler", "Guy Horton",
  "Max Murray", "Ian Healey", "Freddie Palmer", "Jake Graham",
  "Callum Dagnall", "Tom Beeston",
];

export const AVATAR_SRC = Object.fromEntries(SQUAD.map(n => [
  n, `/players/${n.toLowerCase().replace(/\s+/g, '-')}.jpg`,
]));

export function MetricsAvatar({ name, size = 40, border = "#e8ff0055", style = {} }) {
  const src = AVATAR_SRC[name];
  if (!src) {
    const initials = (name || "").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "#ffffff15", border: "1px solid #ffffff20",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Oswald',sans-serif", fontWeight: 700,
        fontSize: size > 30 ? ".75rem" : ".55rem", color: "#ffffff55",
        flexShrink: 0, ...style,
      }}>{initials || "?"}</div>
    );
  }
  return <img src={src} alt={name} style={{
    width: size, height: size, borderRadius: "50%", objectFit: "cover",
    border: `2px solid ${border}`, flexShrink: 0, ...style,
  }} />;
}

export function Countdown({ onDone, from = 3 }) {
  const [n, setN] = useState(from);
  useEffect(() => {
    if (n <= 0) { onDone(); return; }
    const id = setTimeout(() => setN(n - 1), 700);
    return () => clearTimeout(id);
  }, [n, onDone]);
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex",
      alignItems: "center", justifyContent: "center",
      pointerEvents: "none", zIndex: 5,
    }}>
      <div style={{
        fontFamily: "'Oswald',sans-serif", fontWeight: 800,
        fontSize: "6rem", color: "#e8ff00",
        textShadow: "0 0 30px #e8ff0099",
        animation: "countPulse .7s ease-out",
      }}>{n > 0 ? n : "GO"}</div>
    </div>
  );
}

export function useBlockScroll(active) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prev;
      document.body.style.touchAction = prevTouch;
    };
  }, [active]);
}

export function useWarnBeforeUnload(active) {
  useEffect(() => {
    if (!active) return;
    const h = e => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [active]);
}

export function useRaf(cb, active = true) {
  const ref = useRef();
  useEffect(() => {
    if (!active) return;
    let running = true;
    const loop = t => {
      if (!running) return;
      cb(t);
      ref.current = requestAnimationFrame(loop);
    };
    ref.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(ref.current); };
  }, [active, cb]);
}

export const METRICS_CSS = `
  @keyframes countPulse { 0% { opacity: 0; transform: scale(.6); } 60% { transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes flashIn { from { opacity: 0; transform: scale(.3); } to { opacity: 1; transform: scale(1); } }
  @keyframes scoreIn { 0% { opacity: 0; transform: translateY(18px); } 100% { opacity: 1; transform: translateY(0); } }
  @keyframes barFill { from { width: 0; } }
  .metrics-area { user-select: none; -webkit-user-select: none; touch-action: none; }
  .metrics-area * { user-select: none; -webkit-user-select: none; }
  .metrics-card { background:#111116; border:1px solid #ffffff14; padding:18px 16px; }
  .metrics-title { font-family:'Oswald',sans-serif; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#e8ff00; font-size:.7rem; }
  .metrics-h1 { font-family:'Oswald',sans-serif; font-weight:800; font-size:clamp(1.6rem,5vw,2.4rem); line-height:1; letter-spacing:1px; }
  .metrics-pill-btn { background:#ffffff0c; border:1px solid #ffffff1a; color:#fff; font-family:'Oswald',sans-serif; font-weight:700; letter-spacing:2px; padding:12px 18px; cursor:pointer; font-size:.82rem; text-transform:uppercase; transition:all .15s; }
  .metrics-pill-btn:hover, .metrics-pill-btn:active { background:#e8ff0018; border-color:#e8ff0055; color:#e8ff00; }
  .metrics-tap-zone { position:absolute; display:flex; align-items:center; justify-content:center; touch-action:none; }
`;

export function Section({ children, style = {} }) {
  return (
    <main style={{
      minHeight: "calc(100vh - 96px)",
      padding: "22px 14px 48px",
      maxWidth: 640, margin: "0 auto",
      color: "#fff", position: "relative",
      ...style,
    }}>{children}</main>
  );
}

export function safeName(n) {
  return (n || "").trim().replace(/\s+/g, " ").slice(0, 20);
}

const PROFANITY = [
  "fuck", "shit", "cunt", "nigger", "nigga", "faggot", "fag", "retard", "bitch", "slut", "whore",
  "paki", "wank", "twat", "prick",
];

export function isCleanName(n) {
  const lower = (n || "").toLowerCase().replace(/[\s_\-'.]+/g, "");
  const leet = lower
    .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e")
    .replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t").replace(/\$/g, "s");
  return !PROFANITY.some(w => leet.includes(w));
}

export const NAME_RE = /^[A-Za-z0-9 _'\-.]+$/;
