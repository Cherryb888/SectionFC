import { useEffect, useMemo, useRef, useState } from 'react';
import { Countdown, MetricsAvatar, SQUAD, useBlockScroll } from '../shared.jsx';

const MEMO_MS = 4000;
const RECALL_MS = 30000;

// Three formation shapes on a 0-100 pitch (goal at top).
const FORMATIONS = [
  { id: "3-2-1", slots: [
    { x: 20, y: 20 }, { x: 50, y: 18 }, { x: 80, y: 20 },
    { x: 32, y: 45 }, { x: 68, y: 45 },
    { x: 50, y: 70 },
  ]},
  { id: "2-3-1", slots: [
    { x: 35, y: 18 }, { x: 65, y: 18 },
    { x: 22, y: 45 }, { x: 50, y: 45 }, { x: 78, y: 45 },
    { x: 50, y: 72 },
  ]},
  { id: "2-2-2", slots: [
    { x: 32, y: 18 }, { x: 68, y: 18 },
    { x: 30, y: 42 }, { x: 70, y: 42 },
    { x: 35, y: 70 }, { x: 65, y: 70 },
  ]},
];

function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

export default function TacticsRecall({ onComplete }) {
  const formation = useMemo(() => FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)], []);
  const shuffled = useMemo(() => shuffle(SQUAD), []);
  const correctPlacements = useMemo(() => shuffled.slice(0, formation.slots.length), [shuffled, formation]);
  const distractors = useMemo(() => shuffled.slice(formation.slots.length, formation.slots.length + 4), [shuffled, formation]);
  const palette = useMemo(() => shuffle([...correctPlacements, ...distractors]), [correctPlacements, distractors]);

  const [phase, setPhase] = useState("countdown"); // countdown | memo | recall | done
  const [placements, setPlacements] = useState(() => formation.slots.map(() => null)); // [name|null per slot]
  const [selectedFace, setSelectedFace] = useState(null);
  const [timeLeft, setTimeLeft] = useState(RECALL_MS);
  const startRef = useRef(0);
  const memoStartRef = useRef(0);

  useBlockScroll(phase === "memo");

  useEffect(() => {
    if (phase === "memo") {
      memoStartRef.current = performance.now();
      const id = setTimeout(() => setPhase("recall"), MEMO_MS);
      return () => clearTimeout(id);
    }
    if (phase === "recall") {
      startRef.current = performance.now();
      let raf;
      const tick = () => {
        const left = RECALL_MS - (performance.now() - startRef.current);
        setTimeLeft(Math.max(0, left));
        if (left <= 0) { finish(); return; }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
  }, [phase]);

  const finish = () => {
    const correct = placements.reduce((acc, name, i) => {
      return acc + (name === correctPlacements[i] ? 1 : 0);
    }, 0);
    const timeLeftMs = Math.max(0, RECALL_MS - (performance.now() - startRef.current));
    onComplete({ correct, timeLeftMs: Math.round(timeLeftMs), placements, correctPlacements });
    setPhase("done");
  };

  const pickFace = (name) => {
    if (phase !== "recall") return;
    if (placements.includes(name)) {
      // Already placed — tap to recall it
      setPlacements(p => p.map(x => x === name ? null : x));
      setSelectedFace(null);
      return;
    }
    setSelectedFace(name);
  };

  const pickSlot = (i) => {
    if (phase !== "recall") return;
    if (!selectedFace) {
      // Clear the slot if occupied
      if (placements[i]) {
        setPlacements(p => p.map((x, j) => j === i ? null : x));
      }
      return;
    }
    setPlacements(p => {
      const next = [...p];
      next[i] = selectedFace;
      return next;
    });
    setSelectedFace(null);
  };

  const allPlaced = placements.every(Boolean);

  return (
    <div className="metrics-area" style={{
      position: "relative", minHeight: "calc(100vh - 96px)",
      display: "flex", flexDirection: "column", background: "#0a0a0f",
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #ffffff14" }}>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".6rem", letterSpacing: 3, color: "#e8ff0088" }}>
          GAME 4 / 5 · {formation.id} FORMATION
        </div>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, fontSize: "1.3rem", letterSpacing: 1 }}>TACTICS RECALL</div>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".7rem", color: "#ffffff55", letterSpacing: 1, marginTop: 2 }}>
          {phase === "memo" && "Memorise the lineup — you have 4 seconds."}
          {phase === "recall" && "Tap a face, then tap the slot where it should go."}
          {phase === "countdown" && "Study the formation about to flash up."}
        </div>
      </div>

      <div style={{ padding: 14, position: "relative" }}>
        {phase === "countdown" && <Countdown from={3} onDone={() => setPhase("memo")} />}

        {/* Timer bar during recall — sticky so it stays visible while scrolling */}
        {phase === "recall" && (
          <div style={{
            position: "sticky", top: 0, zIndex: 3,
            height: 6, background: "#0a0a0f",
            marginBottom: 10, border: "1px solid #ffffff10",
          }}>
            <div style={{
              width: `${(timeLeft / RECALL_MS) * 100}%`, height: "100%",
              background: timeLeft > 8000 ? "#e8ff00" : "#ff5555",
              transition: "width .05s linear",
            }} />
          </div>
        )}

        {/* Pitch with slots — capped so palette + LOCK IN stay reachable on short viewports */}
        <div style={{
          position: "relative", width: "100%",
          aspectRatio: "4 / 5", maxHeight: "38vh",
          maxWidth: "min(100%, calc(38vh * 4/5))",
          margin: "0 auto",
          border: "2px solid #ffffff22",
          background: "linear-gradient(180deg,#0d2416 0%,#0a1e12 100%)",
        }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <rect x="30" y="0" width="40" height="14" fill="none" stroke="#ffffff33" strokeWidth=".3" />
            <line x1="0" y1="100" x2="100" y2="100" stroke="#ffffff33" strokeWidth=".3" />
          </svg>
          <div style={{
            position: "absolute", left: "38%", right: "38%", top: -4, height: 6,
            background: "#e8ff00", boxShadow: "0 0 12px #e8ff00",
          }} />

          {formation.slots.map((s, i) => {
            const occupiedBy = phase === "memo" ? correctPlacements[i] : placements[i];
            const isCorrect = phase === "done" && placements[i] === correctPlacements[i];
            return (
              <div
                key={i}
                onPointerDown={(e) => { e.preventDefault(); pickSlot(i); }}
                style={{
                  position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
                  transform: "translate(-50%,-50%)",
                  width: 52, height: 52, borderRadius: "50%",
                  border: `2px dashed ${occupiedBy ? "transparent" : "#e8ff0066"}`,
                  background: occupiedBy ? "transparent" : "#0a0a0f55",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: phase === "recall" ? "pointer" : "default",
                  boxShadow: phase === "recall" && selectedFace ? "0 0 12px #e8ff0066" : "none",
                  touchAction: "none",
                }}
              >
                {occupiedBy && (
                  <MetricsAvatar
                    name={occupiedBy}
                    size={46}
                    border={isCorrect ? "#e8ff00" : "#ffffff55"}
                    style={phase === "memo" ? { animation: "flashIn .3s ease-out" } : {}}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Palette */}
        {phase === "recall" && (
          <div style={{
            marginTop: 14, padding: 10,
            background: "#ffffff05", border: "1px solid #ffffff12",
          }}>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".62rem", letterSpacing: 2, color: "#ffffff55", marginBottom: 8 }}>
              PALETTE {selectedFace ? <span style={{ color: "#e8ff00", marginLeft: 6 }}>→ TAP A SLOT</span> : <span style={{ marginLeft: 6 }}>· TAP A FACE</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
              {palette.map(name => {
                const used = placements.includes(name);
                const selected = selectedFace === name;
                return (
                  <button
                    key={name}
                    onPointerDown={(e) => { e.preventDefault(); pickFace(name); }}
                    disabled={used && !selected && selectedFace != null}
                    style={{
                      padding: 6,
                      background: selected ? "#e8ff0022" : used ? "#ffffff04" : "#ffffff0c",
                      border: `1px solid ${selected ? "#e8ff00" : "#ffffff1a"}`,
                      opacity: used && !selected ? .35 : 1,
                      display: "flex", flexDirection: "column",
                      alignItems: "center", gap: 4,
                      cursor: "pointer", touchAction: "none",
                      fontFamily: "'Oswald',sans-serif",
                    }}
                  >
                    <MetricsAvatar name={name} size={36} border={selected ? "#e8ff00" : "#ffffff33"} />
                    <div style={{ fontSize: ".5rem", color: "#ffffffaa", letterSpacing: .5, textAlign: "center", lineHeight: 1.05 }}>
                      {name.split(" ").map((w, i) => <div key={i}>{w}</div>)}
                    </div>
                  </button>
                );
              })}
            </div>

          </div>
        )}

        {/* Sticky LOCK IN bar so it's always reachable on short viewports */}
        {phase === "recall" && (
          <div style={{
            position: "sticky", bottom: 0, left: 0, right: 0,
            padding: "10px 0 calc(10px + env(safe-area-inset-bottom))",
            background: "linear-gradient(180deg, transparent, #0a0a0f 40%)",
            zIndex: 4,
          }}>
            <button
              disabled={!allPlaced}
              onPointerDown={(e) => { e.preventDefault(); if (allPlaced) finish(); }}
              style={{
                width: "100%", padding: "14px",
                background: allPlaced ? "#e8ff00" : "#2a2a2a",
                color: allPlaced ? "#0a0a0f" : "#555",
                border: "none", cursor: allPlaced ? "pointer" : "not-allowed",
                fontFamily: "'Oswald',sans-serif", fontWeight: 800,
                letterSpacing: 3, fontSize: ".9rem", touchAction: "none",
              }}
            >
              {allPlaced ? "LOCK IN →" : `${placements.filter(Boolean).length}/${formation.slots.length} PLACED`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
