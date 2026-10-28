// ── Season maths ─────────────────────────────────────────────────────────────
// Everything on the stats and home screens is worked out from the matches, so
// there's no second set of numbers to keep in step with the results.

export const STAT_COLS = [
  { key: "apps",    label: "Apps", long: "Appearances" },
  { key: "goals",   label: "G",    long: "Goals" },
  { key: "assists", label: "A",    long: "Assists" },
  { key: "motm",    label: "MOTM", long: "Man of the Match" },
  { key: "cs",      label: "CS",   long: "Clean sheets" },
  { key: "yellows", label: "YC",   long: "Yellow cards" },
  { key: "reds",    label: "RC",   long: "Red cards" },
];

export const results  = team => team.matches.filter(m => m.status === "result").sort(byDate);
export const fixtures = team => team.matches.filter(m => m.status !== "result").sort(byDate);

// Oldest first. Undated games go last.
export function byDate(a, b) {
  return (a.date || "9999").localeCompare(b.date || "9999") || (a.time || "").localeCompare(b.time || "");
}

export const outcome = m => (m.gf > m.ga ? "W" : m.gf < m.ga ? "L" : "D");

export function record(team) {
  const r = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  results(team).forEach(m => {
    r.p++; r.gf += m.gf; r.ga += m.ga;
    r[outcome(m).toLowerCase()]++;
  });
  return { ...r, gd: r.gf - r.ga, pts: r.w * 3 + r.d, ppg: r.p ? (r.w * 3 + r.d) / r.p : 0 };
}

export const form = (team, n = 5) => results(team).slice(-n).map(outcome);

// Per-player season totals. A clean sheet goes to whoever played in goal.
export function playerStats(team) {
  const rows = Object.fromEntries(team.players.map(p => [p.id, {
    apps: 0, goals: 0, assists: 0, motm: 0, cs: 0, yellows: 0, reds: 0,
  }]));
  results(team).forEach(m => {
    (m.played || []).forEach(id => {
      const row = rows[id];
      if (!row) return;
      row.apps++;
      const e = m.events?.[id] || {};
      row.goals   += e.goals   || 0;
      row.assists += e.assists || 0;
      row.yellows += e.yellows || 0;
      row.reds    += e.reds    || 0;
      if (m.motm === id) row.motm++;
      if (m.ga === 0 && m.keeper === id) row.cs++;
    });
  });
  return rows;
}

// Players sorted by one stat; ties go to goals, then appearances, then name.
export function leaderboard(team, key, stats = playerStats(team)) {
  return team.players
    .filter(p => stats[p.id])
    .map(p => ({ player: p, value: stats[p.id][key], stats: stats[p.id] }))
    .sort((a, b) =>
      b.value - a.value ||
      b.stats.goals - a.stats.goals ||
      b.stats.apps - a.stats.apps ||
      a.player.name.localeCompare(b.player.name));
}

// Subs owed: the match fee for every result a player appeared in and hasn't
// been marked paid for.
export function subsOwed(team) {
  const fee = Number(team.settings?.matchFee) || 0;
  const owed = Object.fromEntries(team.players.map(p => [p.id, { games: 0, amount: 0 }]));
  if (!fee) return owed;
  results(team).forEach(m => (m.played || []).forEach(id => {
    if (!owed[id] || team.payments?.[m.id]?.[id]) return;
    owed[id].games++;
    owed[id].amount += fee;
  }));
  return owed;
}

export const money = n => `£${(Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0)}`;

export function prettyDate(iso) {
  if (!iso) return "Date TBC";
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
