// Pure score conversion functions for the Section Metrics combine.
// Each returns an integer 0..100. Curves are deliberately harsh:
// "genuinely good" ~ 80, "exceptional" ~ 95, perfection = 100.

function piecewise(x, points) {
  // points: sorted [[xi, yi], ...]
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i], [x2, y2] = points[i + 1];
    if (x >= x1 && x <= x2) {
      const t = (x - x1) / (x2 - x1);
      return y1 + t * (y2 - y1);
    }
  }
  return 0;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const toInt = v => Math.round(clamp(v, 0, 100));

// Game 1 — Target Shooter. raw.shots = [{hit, dist, targetR, t}]
export function scoreAccuracy(raw) {
  const shots = raw.shots || [];
  let S = 0;
  for (const s of shots) {
    if (!s.hit) continue;
    const centre = Math.max(0, 1 - (s.dist / s.targetR));
    const timeMult = s.t <= 400 ? 1.0 : Math.max(0.4, 1.0 - (s.t - 400) / 2000);
    S += centre * timeMult;
  }
  return toInt(piecewise(S, [
    [0, 0], [1.5, 35], [2.5, 50], [3.5, 70],
    [4.3, 80], [4.75, 95], [5.0, 100],
  ]));
}

// Game 2 — Keeper Dive. raw.rts = [ms, ...] with 700 for miss, 1000 for wrong side
export function scoreReaction(raw) {
  const rts = raw.rts || [];
  const wrongSides = raw.wrongSides || 0;
  if (!rts.length) return 0;
  const avg = rts.reduce((a, b) => a + b, 0) / rts.length;
  let score = piecewise(avg, [
    [200, 100], [230, 95], [280, 80], [350, 70],
    [450, 50], [600, 30], [900, 10],
  ]);
  if (wrongSides >= 1) score = Math.min(score, 85);
  if (wrongSides >= 2) score = Math.min(score, 70);
  return toInt(score);
}

// Game 3 — Sprint Meter. raw.taps = valid alternating count in 6s window
export function scoreSpeed(raw) {
  const taps = raw.taps || 0;
  return toInt(piecewise(taps, [
    [0, 0], [18, 20], [30, 50], [42, 70],
    [54, 80], [66, 95], [75, 100],
  ]));
}

// Game 4 — Tactics Recall. raw.correct ∈ [0,6], raw.timeLeftMs ∈ [0,30000]
export function scoreMemory(raw) {
  const correct = raw.correct || 0;
  const timeLeftMs = Math.max(0, raw.timeLeftMs || 0);
  const val = correct + (timeLeftMs / 30000) * 0.5 * correct;
  return toInt(piecewise(val, [
    [0, 0], [2, 30], [4, 55], [6, 75],
    [7.5, 85], [8.5, 95], [9, 100],
  ]));
}

// Game 5 — Pass or Shoot. raw.picks = [{ result: "best"|"secondBest"|"wrong"|"timeout" }]
export function scoreDecision(raw) {
  const picks = raw.picks || [];
  let sum = 0;
  for (const p of picks) {
    if (p.result === "best") sum += 20;
    else if (p.result === "secondBest") sum += 10;
  }
  return toInt(piecewise(sum, [
    [0, 0], [20, 20], [40, 35], [60, 55],
    [80, 75], [90, 85], [100, 100],
  ]));
}

// Final OVR weighted average.
export function computeOVR(scores) {
  const {
    accuracy = 0, reaction = 0, speed = 0, memory = 0, decision = 0,
  } = scores;
  const ovr =
    0.22 * accuracy +
    0.18 * reaction +
    0.15 * speed +
    0.25 * memory +
    0.20 * decision;
  return toInt(ovr);
}

export function tierOf(ovr) {
  if (ovr >= 90) return { label: "ELITE",        colour: "#e8ff00" };
  if (ovr >= 80) return { label: "FIRST TEAM",   colour: "#ccff55" };
  if (ovr >= 70) return { label: "STARTING XI",  colour: "#88dd88" };
  if (ovr >= 60) return { label: "SQUAD PLAYER", colour: "#dddddd" };
  if (ovr >= 50) return { label: "BENCH",        colour: "#aaaaaa" };
  return            { label: "TRIALIST",       colour: "#ff8866" };
}
