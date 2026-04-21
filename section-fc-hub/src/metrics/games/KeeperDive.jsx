import { useEffect, useRef, useState } from 'react';
import { Countdown, MetricsAvatar, useBlockScroll } from '../shared.jsx';

const ROUNDS = 6;
const MAX_RT = 1000;

export default function KeeperDive({ onComplete }) {
  const [phase, setPhase] = useState("countdown"); // countdown | waiting | ball | result | done
  const [round, setRound] = useState(0);
  const [ballSide, setBallSide] = useState(null); // "L" | "R"
  const [lastRt, setLastRt] = useState(null);
  const [lastWrong, setLastWrong] = useState(false);
  const rtsRef = useRef([]);
  const wrongRef = useRef(0);
  const ballShownAtRef = useRef(0);
  const timerRef = useRef(null);

  useBlockScroll(phase !== "countdown" && phase !== "done");

  const scheduleBall = () => {
    setPhase("waiting");
    setBallSide(null);
    const delay = 1200 + Math.random() * 2300; // 1.2 - 3.5s
    timerRef.current = setTimeout(() => {
      const side = Math.random() < 0.5 ? "L" : "R";
      setBallSide(side);
      setPhase("ball");
      ballShownAtRef.current = performance.now();
      timerRef.current = setTimeout(() => {
        record(null, false); // timeout → miss
      }, MAX_RT);
    }, delay);
  };

  const record = (rt, wrong) => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const recorded = rt == null ? 700 : (wrong ? 1000 : rt);
    rtsRef.current.push(Math.round(recorded));
    if (wrong) wrongRef.current++;
    setLastRt(rt == null ? null : Math.round(rt));
    setLastWrong(!!wrong);
    setPhase("result");
    setTimeout(() => {
      const next = round + 1;
      if (next >= ROUNDS) {
        onComplete({ rts: rtsRef.current, wrongSides: wrongRef.current });
        setPhase("done");
      } else {
        setRound(next);
        scheduleBall();
      }
    }, 900);
  };

  const guess = (side) => (e) => {
    if (e) e.preventDefault();
    if (phase === "waiting") {
      // Pre-emptive → treat as wrong side
      record(MAX_RT, true);
      return;
    }
    if (phase !== "ball" || !ballSide) return;
    const rt = performance.now() - ballShownAtRef.current;
    record(rt, side !== ballSide);
    if (navigator.vibrate) navigator.vibrate(side === ballSide ? 15 : 30);
  };

  useEffect(() => {
    const h = (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === "a" || k === "arrowleft") guess("L")(e);
      else if (k === "l" || k === "arrowright") guess("R")(e);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="metrics-area" style={{
      position: "relative", height: "calc(100vh - 96px)",
      display: "flex", flexDirection: "column", background: "#0a0a0f",
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #ffffff14" }}>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".6rem", letterSpacing: 3, color: "#e8ff0088" }}>GAME 2 / 5 · ROUND {Math.min(round + 1, ROUNDS)}/{ROUNDS}</div>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, fontSize: "1.3rem", letterSpacing: 1 }}>KEEPER DIVE</div>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".7rem", color: "#ffffff55", letterSpacing: 1, marginTop: 2 }}>
          Dive to the side the ball flashes. <span style={{ color: "#e8ff0088" }}>(A / L or ←/→)</span>
        </div>
      </div>

      <div style={{ position: "relative", flex: 1 }}>
        {phase === "countdown" && (
          <Countdown from={3} onDone={() => { setRound(0); scheduleBall(); }} />
        )}

        {/* Goal frame */}
        <svg viewBox="0 0 800 400" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <defs>
            <pattern id="net" width="14" height="14" patternUnits="userSpaceOnUse">
              <path d="M 14 0 L 0 0 0 14" fill="none" stroke="#ffffff14" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="40" y="40" width="720" height="300" fill="url(#net)" stroke="#ffffffcc" strokeWidth="6" />
          <line x1="400" y1="40" x2="400" y2="340" stroke="#ffffff0a" strokeWidth="2" strokeDasharray="4 6" />
          {/* Ball */}
          {ballSide && (
            <circle
              cx={ballSide === "L" ? 200 : 600} cy={220} r={32}
              fill="#fff" stroke="#e8ff00" strokeWidth="4"
              style={{ animation: "flashIn .15s ease-out", filter: "drop-shadow(0 0 12px #e8ff00cc)" }}
            />
          )}
        </svg>

        {/* Keeper centred */}
        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%,-50%)", pointerEvents: "none",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        }}>
          <MetricsAvatar name="Matt Lampitt" size={70} border="#e8ff00aa" />
          <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".55rem", letterSpacing: 2, color: "#e8ff00aa" }}>GK</div>
        </div>

        {/* Tap zones */}
        <div
          onPointerDown={guess("L")}
          style={{
            position: "absolute", left: 0, top: 0, width: "50%", height: "100%",
            touchAction: "none", cursor: "pointer",
          }}
        />
        <div
          onPointerDown={guess("R")}
          style={{
            position: "absolute", right: 0, top: 0, width: "50%", height: "100%",
            touchAction: "none", cursor: "pointer",
          }}
        />

        {/* Result overlay */}
        {phase === "result" && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            background: "#0a0a0faa", pointerEvents: "none",
          }}>
            <div style={{ textAlign: "center", fontFamily: "'Oswald',sans-serif" }}>
              <div style={{
                fontWeight: 800, fontSize: "2rem",
                color: lastWrong ? "#ff5555" : (lastRt == null ? "#ff8800" : "#e8ff00"),
                letterSpacing: 2,
              }}>
                {lastWrong ? "WRONG SIDE" : (lastRt == null ? "TOO SLOW" : `${lastRt}ms`)}
              </div>
            </div>
          </div>
        )}

        {phase === "waiting" && (
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 28,
            textAlign: "center", fontFamily: "'Oswald',sans-serif",
            fontSize: ".7rem", letterSpacing: 3, color: "#ffffff44",
          }}>WAIT FOR IT…</div>
        )}
      </div>
    </div>
  );
}
