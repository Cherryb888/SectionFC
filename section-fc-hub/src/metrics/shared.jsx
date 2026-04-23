import { useEffect, useRef, useState } from 'react';

// Generic name pool for the Tactics Recall memory game.
// These are just placeholder cards — not linked to any specific club.
export const SQUAD = [
  'Alex Rivera', 'Ben Carter', 'Chris Dunn', 'Dan Foster',
  'Ethan Gray', 'Finn Howell', 'George Irving', 'Harry Jenkins',
  'Isaac King', 'Jake Lawson', 'Kai Marsh', 'Leo Nash',
  'Matt Owen', 'Nathan Price', 'Owen Quinn', 'Paul Reeves',
  'Quincy Shaw', 'Ryan Tate',
];

export function MetricsAvatar({ name, size = 40, border = '#e8ff0055', style = {} }) {
  const initials = (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#ffffff12', border: `1px solid ${border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Oswald',sans-serif", fontWeight: 700,
      fontSize: size > 42 ? '.9rem' : size > 30 ? '.75rem' : '.55rem',
      color: '#e8ff00',
      flexShrink: 0, ...style,
    }}>{initials || '?'}</div>
  );
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
      position: 'absolute', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none', zIndex: 5,
    }}>
      <div style={{
        fontFamily: "'Oswald',sans-serif", fontWeight: 800,
        fontSize: '6rem', color: 'var(--primary, #e8ff00)',
        textShadow: '0 0 30px #e8ff0099',
        animation: 'countPulse .7s ease-out',
      }}>{n > 0 ? n : 'GO'}</div>
    </div>
  );
}

export function useBlockScroll(active) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = prev;
      document.body.style.touchAction = prevTouch;
    };
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
  .metrics-pill-btn { background:#ffffff0c; border:1px solid #ffffff1a; color:#fff; font-family:'Oswald',sans-serif; font-weight:700; letter-spacing:2px; padding:12px 18px; cursor:pointer; font-size:.82rem; text-transform:uppercase; transition:all .15s; }
  .metrics-pill-btn:hover, .metrics-pill-btn:active { background:var(--primary-dim); border-color:var(--primary); color:var(--primary); }
`;

export const NAME_RE = /^[A-Za-z0-9 _'\-.]+$/;

export function safeName(n) {
  return (n || '').trim().replace(/\s+/g, ' ').slice(0, 40);
}
