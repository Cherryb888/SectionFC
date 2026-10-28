// ── Formats ──────────────────────────────────────────────────────────────────
// Every side size a team can pick, 5 to 11-a-side, and the formations each one
// offers. A formation is outfield lines from the back, so "2-1-1" is two
// defenders, one midfielder, one attacker, plus the keeper. Pitch positions
// are worked out from it, so adding a formation is just adding its string.

export const FORMATS = {
  5:  { label: "5-a-side",  formations: ["2-1-1", "1-2-1", "2-2"],                 squadHint: "7–10 players" },
  6:  { label: "6-a-side",  formations: ["2-2-1", "2-1-2", "3-1-1"],               squadHint: "8–12 players" },
  7:  { label: "7-a-side",  formations: ["2-3-1", "3-2-1", "2-1-2-1"],             squadHint: "10–14 players" },
  8:  { label: "8-a-side",  formations: ["3-3-1", "3-2-2", "2-3-2"],               squadHint: "11–15 players" },
  9:  { label: "9-a-side",  formations: ["3-3-2", "3-4-1", "4-3-1"],               squadHint: "12–16 players" },
  10: { label: "10-a-side", formations: ["4-3-2", "3-4-2", "4-4-1"],               squadHint: "13–17 players" },
  11: { label: "11-a-side", formations: ["4-4-2", "4-3-3", "3-5-2", "4-2-3-1"],    squadHint: "15–20 players" },
};

export const FORMAT_SIZES = Object.keys(FORMATS).map(Number);

export const POSITIONS = ["GK", "DEF", "MID", "ATT"];

// Slots for a formation: [{ pos, x, y }] in % of a vertical pitch with our
// goal at the bottom. Keeper first, then each line from the back.
export function formationSlots(formation) {
  const lines = formation.split("-").map(Number);
  const slots = [{ pos: "GK", x: 50, y: 90 }];
  const top = 18, bottom = 72;
  lines.forEach((n, li) => {
    const y = lines.length === 1 ? 45 : bottom - (li * (bottom - top)) / (lines.length - 1);
    const pos = li === 0 ? "DEF" : li === lines.length - 1 ? "ATT" : "MID";
    for (let i = 0; i < n; i++) {
      // Spread wider lines further across the pitch.
      const spread = Math.min(84, 22 * n + 8);
      const x = n === 1 ? 50 : 50 - spread / 2 + (i * spread) / (n - 1);
      slots.push({ pos, x, y });
    }
  });
  return slots;
}

export const defaultFormation = size => FORMATS[size].formations[0];
