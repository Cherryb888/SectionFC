import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { MetricsAvatar, SQUAD } from './shared.jsx';
import { tierOf } from './scoring.js';

const SQUAD_SET = new Set(SQUAD);

export default function Leaderboard({ isAdmin, highlightRunId }) {
  const [runs, setRuns] = useState([]);
  const [flags, setFlags] = useState({});
  const [mode, setMode] = useState("best"); // "best" | "all"
  const [openId, setOpenId] = useState(highlightRunId || null);

  useEffect(() => {
    const q = query(collection(db, "metricsRuns"), orderBy("ovr", "desc"), orderBy("submittedAt", "desc"), limit(200));
    return onSnapshot(q, snap => {
      setRuns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "metricsFlags"), snap => {
      const m = {};
      snap.docs.forEach(d => { m[d.id] = d.data(); });
      setFlags(m);
    });
  }, []);

  const filtered = runs.filter(r => !flags[r.id]);

  const display = useMemo(() => {
    if (mode === "all") return filtered.slice(0, 20);
    const byName = {};
    for (const r of filtered) {
      const key = r.nameLower || (r.name || "").toLowerCase();
      if (!byName[key] || r.ovr > byName[key].ovr) {
        byName[key] = { ...r, attempts: 1 };
      } else {
        byName[key].attempts = (byName[key].attempts || 1) + 1;
      }
    }
    // Count total attempts per name from full filtered list
    const attemptsByName = {};
    for (const r of filtered) {
      const key = r.nameLower || (r.name || "").toLowerCase();
      attemptsByName[key] = (attemptsByName[key] || 0) + 1;
    }
    return Object.values(byName)
      .map(r => ({ ...r, attempts: attemptsByName[r.nameLower || (r.name || "").toLowerCase()] }))
      .sort((a, b) => b.ovr - a.ovr || b.submittedAt - a.submittedAt)
      .slice(0, 20);
  }, [filtered, mode]);

  const softFlag = async (id) => {
    if (!isAdmin) return;
    if (!confirm("Soft-flag this run as a cheating/invalid entry?")) return;
    await setDoc(doc(db, "metricsFlags", id), {
      flaggedAt: Date.now(),
    });
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".62rem", color: "#ffffff55", letterSpacing: 2 }}>
          {display.length} ENTRIES · LIVE
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <ToggleBtn active={mode === "best"} onClick={() => setMode("best")}>BEST PER NAME</ToggleBtn>
          <ToggleBtn active={mode === "all"} onClick={() => setMode("all")}>ALL RUNS</ToggleBtn>
        </div>
      </div>

      {display.length === 0 && (
        <div style={{ padding: "40px 20px", textAlign: "center", background: "#ffffff05", border: "1px solid #ffffff0e" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>🏁</div>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: "1rem", color: "#ffffff55", letterSpacing: 2 }}>
            NO RUNS YET
          </div>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".7rem", color: "#ffffff30", letterSpacing: 1, marginTop: 8 }}>
            Be the first to play the combine.
          </div>
        </div>
      )}

      {display.map((r, i) => (
        <LeaderRow
          key={r.id}
          row={r}
          rank={i + 1}
          open={openId === r.id}
          highlight={r.id === highlightRunId}
          showAttempts={mode === "best"}
          onToggle={() => setOpenId(openId === r.id ? null : r.id)}
          isAdmin={isAdmin}
          onFlag={() => softFlag(r.id)}
        />
      ))}
    </div>
  );
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "#e8ff0020" : "transparent",
      border: `1px solid ${active ? "#e8ff0066" : "#ffffff18"}`,
      color: active ? "#e8ff00" : "#ffffff66",
      fontFamily: "'Oswald',sans-serif", fontWeight: 700,
      letterSpacing: 2, fontSize: ".6rem",
      padding: "6px 10px", cursor: "pointer",
    }}>{children}</button>
  );
}

function LeaderRow({ row, rank, open, highlight, showAttempts, onToggle, isAdmin, onFlag }) {
  const squad = SQUAD_SET.has(row.name);
  const tier = tierOf(row.ovr);
  const medal = rank === 1 ? "#e8ff00" : rank === 2 ? "#c0c0c0" : rank === 3 ? "#cd7f32" : null;
  return (
    <div style={{
      background: highlight ? "#e8ff0012" : "#ffffff05",
      border: `1px solid ${highlight ? "#e8ff0055" : "#ffffff0e"}`,
      marginBottom: 6,
      overflow: "hidden",
    }}>
      <div
        onClick={onToggle}
        style={{
          padding: "10px 12px", display: "flex", alignItems: "center", gap: 10,
          cursor: "pointer",
        }}
      >
        <div style={{
          width: 26, fontFamily: "'Oswald',sans-serif", fontWeight: 800,
          fontSize: ".95rem", color: medal || "#ffffff55", textAlign: "center",
        }}>{rank}</div>
        <MetricsAvatar name={row.name} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              fontFamily: "'Oswald',sans-serif", fontWeight: 700,
              fontSize: ".92rem", color: "#fff",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{row.name}</div>
            {squad && (
              <span style={{
                fontFamily: "'Oswald',sans-serif", fontSize: ".5rem",
                background: "#e8ff00", color: "#0a0a0f",
                padding: "2px 5px", letterSpacing: 1.5, fontWeight: 800,
              }}>SQUAD</span>
            )}
          </div>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".6rem", letterSpacing: 2, color: "#ffffff44", marginTop: 2 }}>
            {tier.label}{showAttempts && row.attempts > 1 ? ` · ${row.attempts} ATTEMPTS` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, fontSize: "1.4rem", color: tier.colour, lineHeight: 1 }}>{row.ovr}</div>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".5rem", letterSpacing: 2, color: "#ffffff44" }}>OVR</div>
        </div>
      </div>

      {open && (
        <div style={{ padding: "4px 12px 12px", borderTop: "1px solid #ffffff0c" }}>
          {[
            ["Accuracy", row.scores?.accuracy],
            ["Reaction", row.scores?.reaction],
            ["Speed",    row.scores?.speed],
            ["Memory",   row.scores?.memory],
            ["Decision", row.scores?.decision],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
              <div style={{ width: 70, fontFamily: "'Oswald',sans-serif", fontSize: ".65rem", letterSpacing: 1, color: "#ffffff88" }}>{label}</div>
              <div style={{ flex: 1, height: 6, background: "#ffffff10" }}>
                <div style={{ width: `${val || 0}%`, height: "100%", background: "#e8ff00" }} />
              </div>
              <div style={{ width: 28, textAlign: "right", fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: ".75rem", color: "#e8ff00" }}>{val || 0}</div>
            </div>
          ))}
          {isAdmin && (
            <button onClick={(e) => { e.stopPropagation(); onFlag(); }}
              style={{ marginTop: 8, background: "transparent", border: "1px solid #ff555544", color: "#ff5555", padding: "5px 10px", cursor: "pointer", fontFamily: "'Oswald',sans-serif", fontSize: ".6rem", letterSpacing: 2 }}>
              ⚠ SOFT-FLAG
            </button>
          )}
        </div>
      )}
    </div>
  );
}
