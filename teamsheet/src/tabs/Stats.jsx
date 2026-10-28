import { useState } from "react";
import { LeaderCard } from "../cards";
import { STAT_COLS, leaderboard, playerStats, results } from "../stats";
import { Avatar, Empty, ShareModal } from "../ui";

const AWARDS = [
  { key: "goals",   title: "Golden Boot",   icon: "⚽", unit: "goals" },
  { key: "assists", title: "Playmaker",     icon: "🎯", unit: "assists" },
  { key: "motm",    title: "Star Man",      icon: "⭐", unit: "MOTM" },
  { key: "apps",    title: "Ever Present",  icon: "🛡️", unit: "apps" },
  { key: "cs",      title: "Safe Hands",    icon: "🧤", unit: "clean sheets" },
];

export default function Stats({ team }) {
  const [sort, setSort] = useState("goals");
  const [sharing, setSharing] = useState(null);
  const stats = playerStats(team);
  const rows = leaderboard(team, sort, stats);
  const seasons = team.archive || [];

  if (!results(team).length) return (
    <div className="stack">
      <Empty icon="📊" title="Stats start after the first result">
        <p className="muted">Goals, assists, appearances, clean sheets and MOTM all add up from the results.</p>
      </Empty>
      {seasons.length > 0 && <PastSeasons seasons={seasons} />}
    </div>
  );

  return (
    <div className="stack">
      <div className="awards">
        {AWARDS.map(a => {
          const top = leaderboard(team, a.key, stats)[0];
          return (
            <button key={a.key} className="award" onClick={() => setSharing(a)}>
              <span className="award-icon">{a.icon}</span>
              <small>{a.title}</small>
              {top && top.value > 0 ? <><Avatar player={top.player} size={40} /><b>{top.player.name}</b><span>{top.value} {a.unit}</span></>
                : <span className="muted">—</span>}
            </button>
          );
        })}
      </div>

      <section className="card flush">
        <div className="table-wrap">
          <table className="stats-table">
            <thead>
              <tr>
                <th className="left">Player</th>
                {STAT_COLS.map(c => (
                  <th key={c.key} title={c.long} className={sort === c.key ? "on" : ""} onClick={() => setSort(c.key)}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.player.id}>
                  <td className="left"><span className="ev-name"><Avatar player={r.player} size={26} />{r.player.name}</span></td>
                  {STAT_COLS.map(c => <td key={c.key} className={sort === c.key ? "on" : ""}>{r.stats[c.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="muted small center">Tap a column to sort. Tap an award to share it.</p>

      {seasons.length > 0 && <PastSeasons seasons={seasons} />}

      {sharing && (
        <ShareModal title={`Share ${sharing.title}`} filename={`${team.name}-${sharing.key}.png`}
          caption={`${sharing.icon} ${sharing.title} race, ${team.name}`} onClose={() => setSharing(null)}>
          <LeaderCard team={team} title={sharing.title} unit={sharing.unit}
            rows={leaderboard(team, sharing.key, stats).filter(r => r.value > 0)} />
        </ShareModal>
      )}
    </div>
  );
}

// Closed seasons keep their record and award winners, frozen when they closed.
function PastSeasons({ seasons }) {
  return (
    <section className="card">
      <div className="card-head"><h3>Past seasons</h3></div>
      {[...seasons].reverse().map(s => (
        <div key={s.closedAt} className="past">
          <b>{s.name || "Season"}</b>
          <small className="muted">{s.record.p} played · {s.record.w}W {s.record.d}D {s.record.l}L · {s.record.gf}–{s.record.ga}</small>
          <div className="past-awards">
            {s.awards.map(a => <span key={a.title}>{a.icon} {a.title}: <b>{a.name}</b> ({a.value})</span>)}
          </div>
        </div>
      ))}
    </section>
  );
}
