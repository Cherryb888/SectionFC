import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { METRICS_CSS, MetricsAvatar, SQUAD, Section, isCleanName, NAME_RE, safeName } from './metrics/shared.jsx';
import {
  scoreAccuracy, scoreReaction, scoreSpeed, scoreMemory, scoreDecision,
  computeOVR, tierOf,
} from './metrics/scoring.js';
import TargetShooter from './metrics/games/TargetShooter.jsx';
import KeeperDive from './metrics/games/KeeperDive.jsx';
import SprintMeter from './metrics/games/SprintMeter.jsx';
import TacticsRecall from './metrics/games/TacticsRecall.jsx';
import PassOrShoot from './metrics/games/PassOrShoot.jsx';
import Leaderboard from './metrics/Leaderboard.jsx';

const GAMES = [
  { key: "accuracy", title: "Target Shooter",   Component: TargetShooter, scoreFn: scoreAccuracy },
  { key: "reaction", title: "Keeper Dive",      Component: KeeperDive,    scoreFn: scoreReaction },
  { key: "speed",    title: "Sprint Meter",     Component: SprintMeter,   scoreFn: scoreSpeed    },
  { key: "memory",   title: "Tactics Recall",   Component: TacticsRecall, scoreFn: scoreMemory   },
  { key: "decision", title: "Pass or Shoot",    Component: PassOrShoot,   scoreFn: scoreDecision },
];

const CLIENT_VERSION = "1.0";
const PENDING_KEY_PREFIX = "metrics:pending:";
const MUTE_KEY = "metrics:mute";

// ── Sound (WebAudio beeps — no asset deps) ───────────────────────────────────
let audioCtx = null;
function beep({ freq = 880, ms = 120, type = "sine", gain = 0.08 }) {
  try {
    if (localStorage.getItem(MUTE_KEY) === "1") return;
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + ms / 1000);
    o.stop(audioCtx.currentTime + ms / 1000);
  } catch {}
}
const whistle = () => { beep({ freq: 1400, ms: 180, type: "square", gain: 0.06 }); setTimeout(() => beep({ freq: 1800, ms: 240, type: "square", gain: 0.05 }), 160); };
const cheer = () => { beep({ freq: 523, ms: 140 }); setTimeout(() => beep({ freq: 659, ms: 140 }), 130); setTimeout(() => beep({ freq: 784, ms: 220 }), 260); };

// ── Plausibility checks run before submit ────────────────────────────────────
function plausibilityCheck({ scores, raw, durationMs, startedAt, submittedAt, name }) {
  const issues = [];
  if (!name || name.length < 1 || name.length > 20) issues.push("name length");
  if (!NAME_RE.test(name)) issues.push("name chars");
  if (submittedAt < startedAt) issues.push("timeline");
  if (durationMs < 45000) issues.push("too fast");
  if (durationMs > 600000) issues.push("too slow");
  for (const k of ["accuracy", "reaction", "speed", "memory", "decision"]) {
    const v = scores[k];
    if (!Number.isInteger(v) || v < 0 || v > 100) issues.push(`${k} range`);
  }
  if (!raw.accuracy?.shots || raw.accuracy.shots.length !== 5) issues.push("accuracy shape");
  if (raw.accuracy?.shots?.some(s => s.t < 0 || s.t > 1700 || s.dist < 0)) issues.push("accuracy values");
  if (!raw.reaction?.rts || raw.reaction.rts.length !== 6) issues.push("reaction shape");
  if (raw.reaction?.rts?.some(rt => rt < 100 || rt > 2000)) issues.push("reaction values");
  if (!Number.isInteger(raw.speed?.taps) || raw.speed.taps < 0 || raw.speed.taps > 120) issues.push("speed taps");
  if (raw.speed?.intervals?.some(iv => iv < 35)) issues.push("speed intervals");
  if (typeof raw.memory?.correct !== "number" || raw.memory.correct < 0 || raw.memory.correct > 6) issues.push("memory shape");
  if (raw.memory?.timeLeftMs > 30000) issues.push("memory time");
  if (!raw.decision?.picks || raw.decision.picks.length !== 5) issues.push("decision shape");
  return issues;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Metrics({ isAdmin }) {
  const [mode, setMode] = useState("intro"); // intro | nameEntry | playing | gameResult | summary | submitted | leaderboard
  const [gameIndex, setGameIndex] = useState(0);
  const [scores, setScores] = useState({ accuracy: null, reaction: null, speed: null, memory: null, decision: null });
  const [raw, setRaw] = useState({});
  const [playerName, setPlayerName] = useState("");
  const [runId, setRunId] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [submitState, setSubmitState] = useState("idle"); // idle | sending | done | error
  const [submittedRank, setSubmittedRank] = useState(null);
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === "1");
  const [pendingResubmits, setPendingResubmits] = useState([]);
  const lastScoreRef = useRef(null);

  // Pick up any unsent pending runs from previous sessions
  useEffect(() => {
    const items = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PENDING_KEY_PREFIX)) {
        try { items.push({ key: k, data: JSON.parse(localStorage.getItem(k)) }); } catch {}
      }
    }
    setPendingResubmits(items);
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  };

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (mode === "intro") {
    return (
      <Section>
        <style>{METRICS_CSS}</style>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".62rem", color: "#e8ff00", letterSpacing: 4, marginBottom: 5 }}>◆ SECTION METRICS</div>
        <h1 className="metrics-h1" style={{ marginBottom: 12 }}>PROVE YOURSELF<br /><span style={{ color: "#e8ff00" }}>IN 5 DRILLS.</span></h1>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".85rem", color: "#ffffffaa", lineHeight: 1.4, letterSpacing: .5, marginBottom: 22 }}>
          A football skills combine. Five tests, scored out of 100 each, weighted into a single OVR rating.
          Average players sit in the 50-70 range. Hitting 80 means you're properly good.
        </div>

        <div className="metrics-card" style={{ marginBottom: 22 }}>
          {GAMES.map((g, i) => (
            <div key={g.key} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: i < GAMES.length - 1 ? "1px solid #ffffff0c" : "none" }}>
              <div style={{ width: 28, height: 28, background: "#e8ff0018", border: "1px solid #e8ff0044", color: "#e8ff00", fontFamily: "'Oswald',sans-serif", fontWeight: 800, fontSize: ".8rem", display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
              <div>
                <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: ".9rem", letterSpacing: 1 }}>{g.title}</div>
                <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".62rem", color: "#ffffff55", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 1 }}>
                  {g.key}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-y" onClick={() => setMode("nameEntry")} style={{ width: "100%", padding: 16, fontSize: "1rem", marginBottom: 8 }}>
          PLAY COMBINE →
        </button>
        <button className="btn btn-ghost" onClick={() => setMode("leaderboard")} style={{ width: "100%", padding: 12 }}>
          🏆 VIEW LEADERBOARD
        </button>

        {pendingResubmits.length > 0 && (
          <div style={{ marginTop: 20, padding: 14, background: "#ff880018", border: "1px solid #ff880055" }}>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".7rem", letterSpacing: 2, color: "#ff8800", marginBottom: 6 }}>
              ⚠ {pendingResubmits.length} UNSENT RUN{pendingResubmits.length > 1 ? "S" : ""}
            </div>
            <button className="btn btn-o" onClick={() => resubmitAll(pendingResubmits, setPendingResubmits)} style={{ width: "100%", fontSize: ".75rem" }}>
              RESUBMIT NOW
            </button>
          </div>
        )}

        <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={toggleMute} style={{
            background: "transparent", border: "1px solid #ffffff22",
            color: muted ? "#ff8855" : "#e8ff00",
            fontFamily: "'Oswald',sans-serif", fontSize: ".65rem", letterSpacing: 2,
            padding: "6px 10px", cursor: "pointer",
          }}>{muted ? "🔇 MUTED" : "🔊 SOUND ON"}</button>
          {isAdmin && <span className="admin-badge">ADMIN</span>}
        </div>
      </Section>
    );
  }

  // ── Name Entry ─────────────────────────────────────────────────────────────
  if (mode === "nameEntry") {
    return (
      <Section>
        <style>{METRICS_CSS}</style>
        <NameEntry
          value={playerName}
          onChange={setPlayerName}
          onStart={(name) => {
            const rid = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
            setRunId(rid);
            setPlayerName(name);
            setStartedAt(Date.now());
            setGameIndex(0);
            setScores({ accuracy: null, reaction: null, speed: null, memory: null, decision: null });
            setRaw({});
            whistle();
            setMode("playing");
          }}
          onBack={() => setMode("intro")}
        />
      </Section>
    );
  }

  // ── Playing a game ─────────────────────────────────────────────────────────
  if (mode === "playing") {
    const game = GAMES[gameIndex];
    const GameComponent = game.Component;
    return (
      <>
        <style>{METRICS_CSS}</style>
        <GameComponent onComplete={(rawResult) => {
          const s = game.scoreFn(rawResult);
          setScores(prev => ({ ...prev, [game.key]: s }));
          setRaw(prev => ({ ...prev, [game.key]: rawResult }));
          lastScoreRef.current = s;
          if (s >= 80) cheer();
          setMode("gameResult");
        }} />
      </>
    );
  }

  // ── Per-game result ────────────────────────────────────────────────────────
  if (mode === "gameResult") {
    const game = GAMES[gameIndex];
    const s = scores[game.key] ?? 0;
    const last = gameIndex === GAMES.length - 1;
    const tier = tierOf(s);
    return (
      <Section>
        <style>{METRICS_CSS}</style>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".62rem", color: "#e8ff0088", letterSpacing: 3, marginBottom: 6 }}>
          GAME {gameIndex + 1} / {GAMES.length} COMPLETE
        </div>
        <h1 className="metrics-h1" style={{ marginBottom: 18 }}>{game.title.toUpperCase()}</h1>

        <div className="metrics-card" style={{ textAlign: "center", padding: "30px 16px", marginBottom: 18, animation: "scoreIn .5s ease-out" }}>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".6rem", letterSpacing: 3, color: "#ffffff55", marginBottom: 6 }}>YOUR SCORE</div>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, fontSize: "clamp(4rem,14vw,6rem)", color: tier.colour, lineHeight: 1 }}>{s}</div>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".75rem", letterSpacing: 3, color: tier.colour, marginTop: 8 }}>{tier.label}</div>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
          {GAMES.map((g, i) => (
            <div key={g.key} style={{
              flex: 1, height: 4,
              background: scores[g.key] != null ? "#e8ff00" : "#ffffff12",
            }} />
          ))}
        </div>

        <button className="btn btn-y" onClick={() => {
          if (last) { setMode("summary"); }
          else { setGameIndex(i => i + 1); setMode("playing"); }
        }} style={{ width: "100%", padding: 16, fontSize: "1rem" }}>
          {last ? "SEE YOUR OVR →" : `NEXT: ${GAMES[gameIndex + 1].title.toUpperCase()} →`}
        </button>
      </Section>
    );
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  if (mode === "summary") {
    const ovr = computeOVR(scores);
    const tier = tierOf(ovr);
    const submittedAt = Date.now();
    const durationMs = submittedAt - (startedAt || submittedAt);

    const submit = async () => {
      setSubmitState("sending");
      const trimmed = safeName(playerName);
      const issues = plausibilityCheck({
        scores, raw, durationMs, startedAt, submittedAt, name: trimmed,
      });
      // Double-check OVR matches
      const recomputed = computeOVR(scores);
      if (Math.abs(recomputed - ovr) > 1) issues.push("ovr mismatch");

      const payload = {
        name: trimmed,
        nameLower: trimmed.toLowerCase(),
        ovr,
        scores,
        raw,
        durationMs,
        startedAt,
        submittedAt,
        clientVersion: CLIENT_VERSION,
        ua: (navigator.userAgent || "").slice(0, 120),
      };

      if (issues.length) {
        setSubmitState("error");
        alert(`Run rejected: ${issues.join(", ")}`);
        return;
      }

      // Stash locally first — survives network fail
      const pendingKey = PENDING_KEY_PREFIX + runId;
      localStorage.setItem(pendingKey, JSON.stringify(payload));
      try {
        await setDoc(doc(db, "metricsRuns", runId), payload);
        localStorage.removeItem(pendingKey);
        setSubmitState("done");
        setMode("submitted");
      } catch (err) {
        setSubmitState("error");
        alert(`Submit failed — run saved locally, you can resubmit later. (${err.message || err})`);
      }
    };

    return (
      <Section>
        <style>{METRICS_CSS}</style>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".62rem", color: "#e8ff0088", letterSpacing: 3, marginBottom: 5 }}>◆ COMBINE COMPLETE</div>
        <h1 className="metrics-h1" style={{ marginBottom: 18 }}>YOUR RATING</h1>

        <div className="metrics-card" style={{ textAlign: "center", padding: "32px 16px", marginBottom: 18, border: `2px solid ${tier.colour}55` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10 }}>
            <MetricsAvatar name={playerName} size={44} />
            <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: "1.1rem" }}>{playerName}</div>
          </div>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, fontSize: "clamp(5rem,18vw,8rem)", color: tier.colour, lineHeight: 1, textShadow: `0 0 30px ${tier.colour}55` }}>{ovr}</div>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".6rem", letterSpacing: 3, color: "#ffffff55", marginTop: 4 }}>OVR</div>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: ".95rem", letterSpacing: 3, color: tier.colour, marginTop: 10 }}>{tier.label}</div>
        </div>

        <div className="metrics-card" style={{ marginBottom: 18 }}>
          {GAMES.map(g => {
            const val = scores[g.key] || 0;
            const t = tierOf(val);
            return (
              <div key={g.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #ffffff08" }}>
                <div style={{ width: 78, fontFamily: "'Oswald',sans-serif", fontSize: ".72rem", color: "#ffffff99", letterSpacing: 1 }}>{g.title}</div>
                <div style={{ flex: 1, height: 8, background: "#ffffff10" }}>
                  <div style={{ width: `${val}%`, height: "100%", background: t.colour }} />
                </div>
                <div style={{ width: 30, textAlign: "right", fontFamily: "'Oswald',sans-serif", fontWeight: 800, fontSize: ".9rem", color: t.colour }}>{val}</div>
              </div>
            );
          })}
        </div>

        <button
          className="btn btn-y"
          onClick={submit}
          disabled={submitState === "sending"}
          style={{ width: "100%", padding: 16, fontSize: "1rem", marginBottom: 8 }}
        >
          {submitState === "sending" ? "SUBMITTING…" : "SUBMIT TO LEADERBOARD"}
        </button>
        <button className="btn btn-ghost" onClick={() => setMode("intro")} style={{ width: "100%", padding: 12 }}>
          SKIP — BACK TO MENU
        </button>
      </Section>
    );
  }

  // ── Submitted ──────────────────────────────────────────────────────────────
  if (mode === "submitted") {
    return (
      <Section>
        <style>{METRICS_CSS}</style>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".62rem", color: "#e8ff0088", letterSpacing: 3, marginBottom: 6 }}>◆ RUN SUBMITTED</div>
        <h1 className="metrics-h1" style={{ marginBottom: 18 }}>YOU'RE ON THE BOARD.</h1>
        <Leaderboard isAdmin={isAdmin} highlightRunId={runId} />
        <button className="btn btn-y" onClick={() => setMode("intro")} style={{ width: "100%", padding: 14, marginTop: 18 }}>
          PLAY AGAIN
        </button>
      </Section>
    );
  }

  // ── Leaderboard standalone ─────────────────────────────────────────────────
  if (mode === "leaderboard") {
    return (
      <Section>
        <style>{METRICS_CSS}</style>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".62rem", color: "#e8ff00", letterSpacing: 4, marginBottom: 5 }}>◆ SECTION METRICS</div>
        <h1 className="metrics-h1" style={{ marginBottom: 18 }}>LEADERBOARD</h1>
        <Leaderboard isAdmin={isAdmin} />
        <button className="btn btn-y" onClick={() => setMode("intro")} style={{ width: "100%", padding: 14, marginTop: 18 }}>
          PLAY COMBINE →
        </button>
      </Section>
    );
  }

  return null;
}

// ── Name Entry component ─────────────────────────────────────────────────────
function NameEntry({ value, onChange, onStart, onBack }) {
  const [touched, setTouched] = useState(false);
  const [showSquad, setShowSquad] = useState(false);
  const trimmed = safeName(value);

  const problem = (() => {
    if (!trimmed) return "Name required";
    if (trimmed.length > 20) return "Max 20 characters";
    if (!NAME_RE.test(trimmed)) return "Letters, numbers, spaces only";
    if (!isCleanName(trimmed)) return "Please choose a different name";
    return null;
  })();

  const valid = !problem;

  return (
    <>
      <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".62rem", color: "#e8ff00", letterSpacing: 4, marginBottom: 5 }}>◆ WHO ARE YOU</div>
      <h1 className="metrics-h1" style={{ marginBottom: 14 }}>ENTER A NAME.</h1>

      <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".72rem", color: "#ffffff66", letterSpacing: 1, marginBottom: 8 }}>
        Free text, or pick a squad player — appears on the leaderboard.
      </div>

      <input
        type="text"
        autoFocus
        value={value}
        maxLength={20}
        onChange={e => { onChange(e.target.value); setTouched(true); }}
        onKeyDown={e => { if (e.key === "Enter" && valid) onStart(trimmed); }}
        placeholder="Your name…"
        style={{
          width: "100%", padding: "14px 16px",
          background: "#ffffff0a", border: `1px solid ${touched && !valid ? "#ff555555" : "#ffffff22"}`,
          color: "#fff", fontFamily: "'Oswald',sans-serif", fontSize: "1.1rem",
          letterSpacing: 2, outline: "none", marginBottom: 8,
        }}
      />

      <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: ".68rem", letterSpacing: 1, minHeight: 16, marginBottom: 14, color: touched && problem ? "#ff6666" : "#ffffff33" }}>
        {touched && problem ? problem : `${trimmed.length}/20`}
      </div>

      <button className="btn btn-ghost" onClick={() => setShowSquad(s => !s)} style={{ marginBottom: 10 }}>
        {showSquad ? "HIDE SQUAD LIST" : "USE SQUAD PLAYER"}
      </button>

      {showSquad && (
        <div className="metrics-card" style={{ marginBottom: 14, padding: 8, maxHeight: 240, overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4 }}>
            {SQUAD.map(n => (
              <button
                key={n}
                onClick={() => { onChange(n); setTouched(true); }}
                style={{
                  background: value === n ? "#e8ff0022" : "#ffffff06",
                  border: `1px solid ${value === n ? "#e8ff00" : "#ffffff10"}`,
                  padding: 6, cursor: "pointer",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 4,
                  fontFamily: "'Oswald',sans-serif",
                }}
              >
                <MetricsAvatar name={n} size={34} />
                <div style={{ fontSize: ".55rem", color: "#ffffffaa", letterSpacing: .5, textAlign: "center", lineHeight: 1.1 }}>{n}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        className="btn btn-y"
        disabled={!valid}
        onClick={() => onStart(trimmed)}
        style={{ width: "100%", padding: 16, fontSize: "1rem", marginBottom: 8 }}
      >
        START COMBINE →
      </button>
      <button className="btn btn-ghost" onClick={onBack} style={{ width: "100%", padding: 10 }}>
        ← BACK
      </button>
    </>
  );
}

async function resubmitAll(items, setItems) {
  const remaining = [];
  for (const it of items) {
    try {
      const id = it.key.replace(PENDING_KEY_PREFIX, "");
      await setDoc(doc(db, "metricsRuns", id), it.data);
      localStorage.removeItem(it.key);
    } catch {
      remaining.push(it);
    }
  }
  setItems(remaining);
  alert(remaining.length === 0 ? "All pending runs sent ✓" : `${remaining.length} still pending`);
}
