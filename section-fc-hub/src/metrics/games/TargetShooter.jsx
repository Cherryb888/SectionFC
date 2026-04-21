import { useEffect, useRef, useState } from 'react';
import { Countdown, useBlockScroll } from '../shared.jsx';

const SHOTS = 5;
const TARGET_LIFE_MS = 1600;
const START_R = 48;     // svg units
const END_R = 22;

// Random target position in the goal (svg 800×400, goal box 40..760 × 40..340)
function randTarget() {
  return {
    cx: 100 + Math.random() * 600,
    cy: 80 + Math.random() * 220,
    spawn: performance.now(),
  };
}

export default function TargetShooter({ onComplete }) {
  const [phase, setPhase] = useState("countdown");
  const [shotIdx, setShotIdx] = useState(0);
  const [target, setTarget] = useState(null);
  const [radius, setRadius] = useState(START_R);
  const [lastHit, setLastHit] = useState(null);
  const shotsRef = useRef([]);
  const svgRef = useRef(null);
  const rafRef = useRef(null);

  useBlockScroll(phase === "play");

  useEffect(() => {
    if (phase !== "play") return;
    if (!target) return;
    const tick = () => {
      const age = performance.now() - target.spawn;
      const p = Math.min(1, age / TARGET_LIFE_MS);
      setRadius(START_R + (END_R - START_R) * p);
      if (age >= TARGET_LIFE_MS) {
        recordShot(null, 0, age);
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, target]);

  const nextShot = () => {
    setShotIdx(i => {
      const next = i + 1;
      if (next >= SHOTS) {
        onComplete({ shots: shotsRef.current });
        setPhase("done");
        return next;
      }
      setTimeout(() => {
        setTarget(randTarget());
        setRadius(START_R);
        setLastHit(null);
      }, 350);
      return next;
    });
  };

  const recordShot = (dist, hit, t) => {
    const targetR = START_R;
    shotsRef.current.push({
      hit: !!hit,
      dist: dist == null ? targetR * 2 : dist,
      targetR,
      t: Math.min(TARGET_LIFE_MS, Math.round(t)),
    });
    setLastHit(hit ? { cx: target.cx, cy: target.cy } : null);
    setTarget(null);
    nextShot();
  };

  const onShoot = (e) => {
    if (phase !== "play" || !target) return;
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const { x, y } = pt.matrixTransform(svg.getScreenCTM().inverse());
    const dx = x - target.cx;
    const dy = y - target.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const age = performance.now() - target.spawn;
    const currentR = START_R + (END_R - START_R) * Math.min(1, age / TARGET_LIFE_MS);
    const hit = dist <= currentR;
    recordShot(dist, hit, age);
    if (navigator.vibrate) navigator.vibrate(hit ? 15 : 5);
  };

  return (
    <div className="metrics-area" style={{
      position: "relative", height: "calc(100vh - 96px)",
      display: "flex", flexDirection: "column", background: "#0a0a0f",
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #ffffff14" }}>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".6rem", letterSpacing: 3, color: "#e8ff0088" }}>
          GAME 1 / 5 · SHOT {Math.min(shotIdx + 1, SHOTS)}/{SHOTS}
        </div>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, fontSize: "1.3rem", letterSpacing: 1 }}>TARGET SHOOTER</div>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".7rem", color: "#ffffff55", letterSpacing: 1, marginTop: 2 }}>
          Tap the target before it shrinks away. Centre hits + speed score higher.
        </div>
      </div>

      <div
        style={{ position: "relative", flex: 1 }}
        onPointerDown={onShoot}
      >
        {phase === "countdown" && (
          <Countdown from={3} onDone={() => {
            setPhase("play");
            setTarget(randTarget());
          }} />
        )}
        <svg ref={svgRef} viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          cursor: "crosshair", touchAction: "none",
        }}>
          <defs>
            <pattern id="net2" width="14" height="14" patternUnits="userSpaceOnUse">
              <path d="M 14 0 L 0 0 0 14" fill="none" stroke="#ffffff14" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="40" y="40" width="720" height="300" fill="url(#net2)" stroke="#ffffffcc" strokeWidth="6" />
          {target && (
            <g style={{ pointerEvents: "none" }}>
              <circle cx={target.cx} cy={target.cy} r={radius} fill="none" stroke="#e8ff00" strokeWidth="3" opacity=".55" />
              <circle cx={target.cx} cy={target.cy} r={radius * 0.66} fill="none" stroke="#e8ff00" strokeWidth="3" opacity=".8" />
              <circle cx={target.cx} cy={target.cy} r={radius * 0.3} fill="#e8ff00" opacity=".85" />
            </g>
          )}
          {lastHit && (
            <circle cx={lastHit.cx} cy={lastHit.cy} r={14} fill="#fff" opacity=".7" style={{ animation: "flashIn .2s ease-out" }} />
          )}
        </svg>
      </div>
    </div>
  );
}
