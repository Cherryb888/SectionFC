import { useState } from "react";
import { LineupCard } from "../cards";
import { FORMATS, defaultFormation, formationSlots } from "../formats";
import { fixtures, prettyDate } from "../stats";
import { Avatar, Empty, ShareModal } from "../ui";

export default function Lineup({ team, admin, save }) {
  const [picked, setPicked] = useState(null); // slot index being filled
  const [sharing, setSharing] = useState(false);
  const formations = FORMATS[team.format].formations;
  const lineup = {
    bench: [], slots: [],
    ...team.lineup,
    formation: formations.includes(team.lineup?.formation) ? team.lineup.formation : defaultFormation(team.format),
  };
  const slots = formationSlots(lineup.formation);
  const byId = Object.fromEntries(team.players.map(p => [p.id, p]));
  const onPitch = new Set(lineup.slots.filter(Boolean));
  const next = fixtures(team)[0];

  const update = patch => save({ lineup: { ...lineup, ...patch } });

  const assign = pid => {
    if (picked === null) return;
    const s = [...lineup.slots];
    while (s.length < slots.length) s.push(null);
    const was = s.indexOf(pid);
    if (was >= 0) s[was] = s[picked]; // swap if they were already on the pitch
    s[picked] = pid;
    update({ slots: s, bench: lineup.bench.filter(b => b !== pid) });
    setPicked(null);
  };
  const clearSlot = i => {
    const s = [...lineup.slots]; s[i] = null;
    update({ slots: s }); setPicked(null);
  };
  const toggleBench = pid => update({
    bench: lineup.bench.includes(pid) ? lineup.bench.filter(b => b !== pid) : [...lineup.bench, pid],
  });

  if (!team.players.length) return (
    <Empty icon="🟢" title="Add players to pick a team">
      <p className="muted">Once the squad's in, pick a formation and drop players onto the pitch.</p>
    </Empty>
  );

  return (
    <div className="stack">
      <div className="row gap wrap">
        <div className="seg">
          {formations.map(f => (
            <button key={f} className={f === lineup.formation ? "on" : ""} disabled={!admin}
              onClick={() => update({ formation: f, slots: lineup.slots.slice(0, formationSlots(f).length) })}>{f}</button>
          ))}
        </div>
        <span className="grow" />
        <button className="btn sm" onClick={() => setSharing(true)}>Share team sheet</button>
      </div>
      {next && <p className="muted small">For {next.home !== false ? "vs" : "@"} {next.opponent}, {prettyDate(next.date)}</p>}

      <div className="lineup-layout">
        <div className="pitch">
          <div className="pitch-lines" />
          {slots.map((s, i) => {
            const p = byId[lineup.slots[i]];
            return (
              <button key={i} className={`pslot ${picked === i ? "picked" : ""}`} style={{ left: `${s.x}%`, top: `${s.y}%` }}
                disabled={!admin} onClick={() => setPicked(picked === i ? null : i)}>
                {p ? <Avatar player={p} size={42} /> : <span className={`shirt ${s.pos === "GK" ? "gk" : ""}`}>＋</span>}
                <small>{p ? p.name.split(" ").slice(-1)[0] : s.pos}</small>
              </button>
            );
          })}
        </div>

        {admin && (
          <div className="pick-list">
            <h4 className="section-title">
              {picked !== null ? `Pick a ${slots[picked].pos === "GK" ? "keeper" : "player"}` : "Tap a shirt, then a player"}
            </h4>
            {picked !== null && lineup.slots[picked] && <button className="btn sm ghost block" onClick={() => clearSlot(picked)}>Empty this spot</button>}
            {team.players.map(p => (
              <div key={p.id} className={`pick-row ${onPitch.has(p.id) ? "on" : ""}`}>
                <button className="pick-main" disabled={picked === null} onClick={() => assign(p.id)}>
                  <Avatar player={p} size={30} />
                  <span className="pick-name">{p.name}</span>
                  <small>{p.pos}</small>
                </button>
                {!onPitch.has(p.id) && (
                  <button className={`chip sm ${lineup.bench.includes(p.id) ? "on" : ""}`} onClick={() => toggleBench(p.id)}>Sub</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {lineup.bench.length > 0 && (
        <p className="muted">Subs: {lineup.bench.map(id => byId[id]?.name).filter(Boolean).join(", ")}</p>
      )}

      {sharing && (
        <ShareModal title="Share team sheet" filename={`${team.name}-lineup.png`}
          caption={`Team for ${next ? `${next.opponent}, ${prettyDate(next.date)}` : "the next game"} 👇`} onClose={() => setSharing(false)}>
          <LineupCard team={team} lineup={lineup} label={next ? `VS ${next.opponent.toUpperCase()}` : undefined} />
        </ShareModal>
      )}
    </div>
  );
}
