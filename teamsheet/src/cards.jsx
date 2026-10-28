// ── Share cards ──────────────────────────────────────────────────────────────
// The images that end up in the group chat. Fixed width so they look the same
// from any phone.

import { formationSlots } from "./formats";
import { money, outcome, prettyDate } from "./stats";
import { Avatar, Crest, Stamp } from "./ui";

const surname = n => n.split(" ").slice(-1)[0];

function CardFrame({ team, kicker, children }) {
  return (
    <div className="scard" style={{ "--c1": team.colors.primary, "--c2": team.colors.secondary }}>
      <div className="scard-top">
        <Crest team={team} size={40} />
        <div><b>{team.name}</b><small>{kicker}</small></div>
      </div>
      {children}
      <Stamp show={!team.paid} />
    </div>
  );
}

export function ResultCard({ team, match }) {
  const byId = Object.fromEntries(team.players.map(p => [p.id, p]));
  const scorers = Object.entries(match.events || {})
    .filter(([pid, e]) => e.goals > 0 && byId[pid])
    .map(([pid, e]) => `${surname(byId[pid].name)}${e.goals > 1 ? ` ${e.goals}` : ""}`);
  const motm = byId[match.motm];
  const res = outcome(match);
  const [l, r] = match.home !== false ? [[team.name, match.gf], [match.opponent, match.ga]] : [[match.opponent, match.ga], [team.name, match.gf]];
  return (
    <CardFrame team={team} kicker={`FULL TIME · ${prettyDate(match.date)}`}>
      <div className={`scard-score r-${res}`}>
        <div><span>{l[0]}</span><b>{l[1]}</b></div>
        <div><span>{r[0]}</span><b>{r[1]}</b></div>
      </div>
      {scorers.length > 0 && <p className="scard-line">⚽ {scorers.join(", ")}</p>}
      {motm && (
        <div className="scard-motm">
          <Avatar player={motm} size={44} />
          <div><small>MAN OF THE MATCH</small><b>{motm.name}</b></div>
        </div>
      )}
    </CardFrame>
  );
}

export function FixtureCard({ team, match }) {
  return (
    <CardFrame team={team} kicker="NEXT MATCH">
      <div className="scard-fixture">
        <b>{match.home !== false ? team.name : match.opponent}</b>
        <span>vs</span>
        <b>{match.home !== false ? match.opponent : team.name}</b>
      </div>
      <p className="scard-line">📅 {prettyDate(match.date)}{match.time ? ` · ${match.time}` : ""}{match.venue ? ` · 📍 ${match.venue}` : ""}</p>
    </CardFrame>
  );
}

export function LineupCard({ team, lineup, label }) {
  const byId = Object.fromEntries(team.players.map(p => [p.id, p]));
  const slots = formationSlots(lineup.formation);
  const bench = (lineup.bench || []).map(id => byId[id]).filter(Boolean);
  return (
    <CardFrame team={team} kicker={`${label || "TEAM SHEET"} · ${lineup.formation}`}>
      <div className="pitch card-pitch">
        <div className="pitch-lines" />
        {slots.map((s, i) => {
          const p = byId[lineup.slots?.[i]];
          return (
            <div key={i} className="pslot" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
              <span className={`shirt ${s.pos === "GK" ? "gk" : ""}`}>{p ? (p.number || "") : ""}</span>
              <small>{p ? surname(p.name) : s.pos}</small>
            </div>
          );
        })}
      </div>
      {bench.length > 0 && <p className="scard-line">Subs: {bench.map(p => surname(p.name)).join(", ")}</p>}
    </CardFrame>
  );
}

export function LeaderCard({ team, title, rows, unit }) {
  return (
    <CardFrame team={team} kicker={`${title.toUpperCase()} · ${team.season?.name || ""}`}>
      <div className="scard-board">
        {rows.slice(0, 5).map((r, i) => (
          <div key={r.player.id} className={i === 0 ? "top" : ""}>
            <span className="rk">{i + 1}</span>
            <Avatar player={r.player} size={i === 0 ? 40 : 30} />
            <span className="nm">{r.player.name}</span>
            <b>{r.value}<small> {unit}</small></b>
          </div>
        ))}
      </div>
    </CardFrame>
  );
}

export function FineCard({ team, fine, player }) {
  return (
    <CardFrame team={team} kicker={`FINES · ${prettyDate(fine.date)}`}>
      <div className="scard-fine">
        <Avatar player={player} size={84} />
        <span className="fined-stamp">FINED</span>
        <b className="fined-name">{player?.name}</b>
        <span className="fined-reason">{fine.emoji} {fine.reason}</span>
        <span className="fined-amt">{money(fine.amount)}</span>
        {fine.note && <p className="fined-note">“{fine.note}”</p>}
      </div>
    </CardFrame>
  );
}
