import { useEffect, useRef, useState } from 'react';
import { Countdown, useBlockScroll } from '../shared.jsx';

const PLAY_MS = 6000;
const MIN_INTERVAL_MS = 35; // taps closer than this are impossible human throughput

export default function SprintMeter({ onComplete }) {
  const [phase, setPhase] = useState("countdown"); // countdown | play | done
  const [taps, setTaps] = useState(0);
  const [activeSide, setActiveSide] = useState(null); // UI highlight only
  const [elapsed, setElapsed] = useState(0);

  // Refs: gate logic. Refs update synchronously so rapid-fire taps can't
  // race past the alternation check (which was the 100/100 cheese).
  const lastSideRef = useRef(null);
  const lastTapRef = useRef(0);
  const intervalsRef = useRef([]);
  const tapsRef = useRef(0);
  const phaseRef = useRef(phase);
  const startRef = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useBlockScroll(phase === "play");

  useEffect(() => {
    if (phase !== "play") return;
    startRef.current = performance.now();
    let raf;
    const tick = () => {
      const e = performance.now() - startRef.current;
      setElapsed(e);
      if (e >= PLAY_MS) {
        onComplete({ taps: tapsRef.current, intervals: intervalsRef.current });
        setPhase("done");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, onComplete]);

  const tap = (side) => {
    if (phaseRef.current !== "play") return;
    if (side === lastSideRef.current) return;          // must alternate
    const now = performance.now();
    if (lastTapRef.current && now - lastTapRef.current < MIN_INTERVAL_MS) return;
    if (lastTapRef.current) intervalsRef.current.push(now - lastTapRef.current);
    lastTapRef.current = now;
    lastSideRef.current = side;
    tapsRef.current += 1;
    setTaps(tapsRef.current);
    setActiveSide(side);
    if (navigator.vibrate) navigator.vibrate(8);
  };

  // Pointer handler factory — stable wrappers are fine, the ref guards prevent stale closures.
  const onPointer = (side) => (e) => { e.preventDefault(); tap(side); };

  useEffect(() => {
    const keyHandler = (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === "a") tap("L");
      else if (k === "l") tap("R");
    };
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, []);

  const pct = Math.min(100, (taps / 75) * 100);
  const timePct = Math.min(100, (elapsed / PLAY_MS) * 100);

  return (
    <div className="metrics-area" style={{
      position: "relative", height: "calc(100vh - 96px)",
      display: "flex", flexDirection: "column",
      background: "#0a0a0f",
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #ffffff14" }}>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".6rem", letterSpacing: 3, color: "#e8ff0088" }}>GAME 3 / 5</div>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, fontSize: "1.3rem", letterSpacing: 1 }}>SPRINT METER</div>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".7rem", color: "#ffffff55", letterSpacing: 1, marginTop: 2 }}>
          Alternate L / R as fast as you can for 6 seconds.
          <span style={{ color: "#e8ff0088", marginLeft: 6 }}>(PC: A / L keys)</span>
        </div>
      </div>

      <div style={{ padding: "18px 16px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Oswald',sans-serif", fontSize: ".7rem", letterSpacing: 2, color: "#ffffff88", marginBottom: 6 }}>
          <span>TAPS: <span style={{ color: "#e8ff00", fontWeight: 800 }}>{taps}</span></span>
          <span>{Math.max(0, ((PLAY_MS - elapsed) / 1000)).toFixed(1)}s</span>
        </div>
        <div style={{ height: 8, background: "#ffffff10", marginBottom: 6 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#e8ff00,#fff)", transition: "width .05s" }} />
        </div>
        <div style={{ height: 3, background: "#ffffff08" }}>
          <div style={{ width: `${timePct}%`, height: "100%", background: "#ff5555" }} />
        </div>
      </div>

      <div style={{ position: "relative", flex: 1, display: "flex", gap: 6, padding: "12px" }}>
        {phase === "countdown" && (
          <Countdown from={3} onDone={() => {
            lastSideRef.current = null;
            lastTapRef.current = 0;
            tapsRef.current = 0;
            intervalsRef.current = [];
            setPhase("play");
          }} />
        )}
        <button
          onPointerDown={onPointer("L")}
          disabled={phase !== "play"}
          style={tapBtnStyle(activeSide === "L")}
        >
          <div style={{ fontSize: "3rem" }}>◀</div>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, fontSize: "1.2rem", letterSpacing: 3 }}>LEFT</div>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".65rem", color: "#ffffff66", letterSpacing: 2 }}>KEY A</div>
        </button>
        <button
          onPointerDown={onPointer("R")}
          disabled={phase !== "play"}
          style={tapBtnStyle(activeSide === "R")}
        >
          <div style={{ fontSize: "3rem" }}>▶</div>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, fontSize: "1.2rem", letterSpacing: 3 }}>RIGHT</div>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".65rem", color: "#ffffff66", letterSpacing: 2 }}>KEY L</div>
        </button>
      </div>
    </div>
  );
}

function tapBtnStyle(active) {
  return {
    flex: 1,
    background: active ? "#e8ff0022" : "#ffffff08",
    border: `2px solid ${active ? "#e8ff00" : "#ffffff1a"}`,
    color: "#fff",
    fontFamily: "'Oswald',sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    transition: "all .03s",
    touchAction: "none",
    outline: "none",
  };
}

SprintMeter.PLAY_MS = PLAY_MS;
