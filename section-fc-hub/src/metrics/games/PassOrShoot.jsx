import { useEffect, useMemo, useRef, useState } from 'react';
import { Countdown, MetricsAvatar, useBlockScroll } from '../shared.jsx';
import { pickScenarios } from './passOrShootData.js';

const DECISION_MS = 2500;

export default function PassOrShoot({ onComplete }) {
  const scenarios = useMemo(() => pickScenarios(5), []);
  const [phase, setPhase] = useState("countdown");
  const [idx, setIdx] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(DECISION_MS);
  const picksRef = useRef([]);
  const startRef = useRef(0);

  useBlockScroll(phase === "play");

  useEffect(() => {
    if (phase !== "play") return;
    startRef.current = performance.now();
    let raf;
    const tick = () => {
      const e = performance.now() - startRef.current;
      const left = DECISION_MS - e;
      setTimeLeft(Math.max(0, left));
      if (left <= 0) {
        pick("timeout");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, idx]);

  const pick = (choice) => {
    if (phase !== "play") return;
    const sc = scenarios[idx];
    let result;
    if (choice === "timeout") result = "timeout";
    else if (choice === sc.best) result = "best";
    else if (choice === sc.secondBest) result = "secondBest";
    else result = "wrong";
    picksRef.current.push({ id: sc.id, choice, result });
    setLastResult({ result, explanation: sc.explanation });
    setPhase("result");
    if (navigator.vibrate) navigator.vibrate(result === "best" ? 20 : 8);
    setTimeout(() => {
      const next = idx + 1;
      if (next >= scenarios.length) {
        onComplete({ picks: picksRef.current });
        setPhase("done");
      } else {
        setIdx(next);
        setLastResult(null);
        setPhase("play");
        setTimeLeft(DECISION_MS);
      }
    }, 1400);
  };

  useEffect(() => {
    const h = (e) => {
      if (e.repeat || phase !== "play") return;
      if (e.key === "1") pick("passLeft");
      else if (e.key === "2") pick("shoot");
      else if (e.key === "3") pick("passRight");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const sc = scenarios[idx];
  const pct = (timeLeft / DECISION_MS) * 100;

  return (
    <div className="metrics-area" style={{
      position: "relative", height: "calc(100vh - 96px)",
      display: "flex", flexDirection: "column", background: "#0a0a0f",
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #ffffff14" }}>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".6rem", letterSpacing: 3, color: "#e8ff0088" }}>
          GAME 5 / 5 · SCENARIO {Math.min(idx + 1, scenarios.length)}/{scenarios.length}
        </div>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, fontSize: "1.3rem", letterSpacing: 1 }}>PASS OR SHOOT</div>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".7rem", color: "#ffffff55", letterSpacing: 1, marginTop: 2 }}>
          Pick the best action within 2.5s. <span style={{ color: "#e8ff0088" }}>(1 / 2 / 3)</span>
        </div>
      </div>

      <div style={{ position: "relative", flex: 1, padding: 14 }}>
        {phase === "countdown" && <Countdown from={3} onDone={() => setPhase("play")} />}

        {/* Pitch */}
        <div style={{
          position: "relative", width: "100%",
          aspectRatio: "3 / 4", maxHeight: "55vh", margin: "0 auto",
          border: "2px solid #ffffff22",
          background:
            "linear-gradient(180deg,#0d2416 0%,#0a1e12 100%)",
        }}>
          {/* Pitch markings */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <rect x="30" y="0" width="40" height="14" fill="none" stroke="#ffffff33" strokeWidth=".3" />
            <rect x="38" y="0" width="24" height="6" fill="none" stroke="#ffffff33" strokeWidth=".3" />
            <circle cx="50" cy="11" r=".7" fill="#ffffff55" />
            <line x1="0" y1="100" x2="100" y2="100" stroke="#ffffff33" strokeWidth=".3" />
          </svg>

          {/* Goal */}
          <div style={{
            position: "absolute", left: "38%", right: "38%", top: -4, height: 6,
            background: "#e8ff00", boxShadow: "0 0 12px #e8ff00",
          }} />

          {sc && (
            <>
              {/* Goalkeeper */}
              <PitchPerson x={sc.goalkeeper.x} y={sc.goalkeeper.y} colour="#ff8800" label="GK" />
              {/* Defenders */}
              {sc.defenders.map((d, i) => <PitchPerson key={"d" + i} x={d.x} y={d.y} colour="#ff4444" label="D" />)}
              {/* Allies */}
              {sc.allies.map((a, i) => (
                <PitchPerson key={"a" + i} x={a.x} y={a.y} colour="#88ff88" avatar={a.name} />
              ))}
              {/* Ball carrier */}
              <PitchPerson x={sc.ball.x} y={sc.ball.y} colour="#e8ff00" avatar={sc.ball.name} ball />
            </>
          )}
        </div>

        {/* Title + timer */}
        {sc && phase === "play" && (
          <div style={{ textAlign: "center", marginTop: 10, fontFamily: "'Oswald',sans-serif" }}>
            <div style={{ fontWeight: 700, letterSpacing: 2, fontSize: ".9rem", color: "#e8ff00" }}>{sc.title}</div>
            <div style={{ height: 4, background: "#ffffff10", marginTop: 8 }}>
              <div style={{ width: `${pct}%`, height: "100%", background: pct > 40 ? "#e8ff00" : "#ff5555", transition: "width .05s" }} />
            </div>
          </div>
        )}

        {/* Choices */}
        {sc && phase === "play" && (
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <ChoiceBtn label="PASS LEFT" sub="1" onPick={() => pick("passLeft")} />
            <ChoiceBtn label="SHOOT"     sub="2" onPick={() => pick("shoot")} highlight />
            <ChoiceBtn label="PASS RIGHT" sub="3" onPick={() => pick("passRight")} />
          </div>
        )}

        {/* Result */}
        {phase === "result" && lastResult && (
          <div style={{
            position: "absolute", left: 14, right: 14, bottom: 14,
            background: "#0a0a0fee", border: `2px solid ${
              lastResult.result === "best" ? "#e8ff00" :
              lastResult.result === "secondBest" ? "#88ff88" :
              lastResult.result === "timeout" ? "#ff8800" : "#ff4444"
            }`,
            padding: "14px 16px", fontFamily: "'Oswald',sans-serif",
          }}>
            <div style={{ fontWeight: 800, letterSpacing: 3, fontSize: "1.1rem", marginBottom: 6, color: "#fff" }}>
              {{
                best: "BEST CHOICE · +20",
                secondBest: "DECENT · +10",
                wrong: "WRONG CALL",
                timeout: "TOO SLOW",
              }[lastResult.result]}
            </div>
            <div style={{ fontSize: ".8rem", color: "#ffffffcc", lineHeight: 1.3 }}>{lastResult.explanation}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function PitchPerson({ x, y, colour, label, avatar, ball }) {
  const size = ball ? 44 : 34;
  return (
    <div style={{
      position: "absolute", left: `${x}%`, top: `${y}%`,
      transform: "translate(-50%,-50%)",
      width: size, height: size,
      borderRadius: "50%", background: colour,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Oswald',sans-serif", fontWeight: 800, fontSize: ".65rem",
      color: "#0a0a0f",
      border: ball ? "3px solid #fff" : `2px solid ${colour}`,
      boxShadow: ball ? "0 0 18px #e8ff00aa" : "none",
    }}>
      {avatar
        ? <MetricsAvatar name={avatar} size={size - 6} border={colour} />
        : label
      }
      {ball && (
        <div style={{
          position: "absolute", bottom: -8, right: -4,
          width: 14, height: 14, borderRadius: "50%",
          background: "#fff", border: "1px solid #0a0a0f",
          boxShadow: "0 0 6px #fff",
        }} />
      )}
    </div>
  );
}

function ChoiceBtn({ label, sub, onPick, highlight }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onPick(); }}
      style={{
        flex: 1, padding: "16px 8px",
        background: highlight ? "#e8ff00" : "#ffffff0c",
        color: highlight ? "#0a0a0f" : "#fff",
        border: `1px solid ${highlight ? "#e8ff00" : "#ffffff22"}`,
        fontFamily: "'Oswald',sans-serif", fontWeight: 800,
        letterSpacing: 2, fontSize: ".82rem",
        cursor: "pointer", touchAction: "none",
      }}
    >
      <div>{label}</div>
      <div style={{ fontSize: ".6rem", opacity: .55, marginTop: 3 }}>KEY {sub}</div>
    </button>
  );
}
