import { useState } from "react";
import { FixtureCard, ResultCard } from "../cards";
import { fixtures, form, leaderboard, outcome, playerStats, prettyDate, record, results } from "../stats";
import { Avatar, Empty, ShareModal } from "../ui";

export default function Home({ team, admin, go }) {
  const [sharing, setSharing] = useState(null);
  const rec = record(team);
  const last = results(team).slice(-1)[0];
  const next = fixtures(team)[0];
  const stats = playerStats(team);
  const boards = [
    { title: "Top scorer", key: "goals", unit: "goals" },
    { title: "Most assists", key: "assists", unit: "assists" },
    { title: "Most MOTM", key: "motm", unit: "awards" },
  ].map(b => ({ ...b, top: leaderboard(team, b.key, stats)[0] }));

  return (
    <div className="stack">
      {team.players.length === 0 && team.matches.length === 0 && (
        <Empty icon="👋" title={admin ? "Let's get your season going" : "Nothing here yet"}>
          {admin
            ? <div className="row gap center-row">
                <button className="btn primary" onClick={() => go("squad")}>Add players</button>
                <button className="btn ghost" onClick={() => go("matches")}>Add a fixture</button>
              </div>
            : <p className="muted">The manager hasn't added anything yet. Check back soon.</p>}
        </Empty>
      )}

      <div className="grid2">
        <section className="card">
          <div className="card-head"><h3>Next match</h3>{next && <button className="link small" onClick={() => setSharing({ kind: "fixture", match: next })}>Share</button>}</div>
          {next ? (
            <div className="match-hero">
              <small>{prettyDate(next.date)}{next.time && ` · ${next.time}`}</small>
              <b>{next.home !== false ? "vs" : "@"} {next.opponent}</b>
              {next.venue && <small>📍 {next.venue}</small>}
            </div>
          ) : <p className="muted">No fixtures yet.{admin && <> <button className="link" onClick={() => go("matches")}>Add one</button></>}</p>}
        </section>

        <section className="card">
          <div className="card-head"><h3>Last result</h3>{last && <button className="link small" onClick={() => setSharing({ kind: "result", match: last })}>Share</button>}</div>
          {last ? (
            <div className={`match-hero r-${outcome(last)}`}>
              <small>{prettyDate(last.date)} · {outcome(last) === "W" ? "Won" : outcome(last) === "L" ? "Lost" : "Drew"}</small>
              <b className="score">{last.gf} – {last.ga}</b>
              <small>{last.home !== false ? "vs" : "@"} {last.opponent}</small>
            </div>
          ) : <p className="muted">No results yet.</p>}
        </section>
      </div>

      <section className="card">
        <div className="card-head"><h3>{team.season?.name || "Season"} so far</h3></div>
        <div className="record">
          {[["P", rec.p], ["W", rec.w], ["D", rec.d], ["L", rec.l], ["GF", rec.gf], ["GA", rec.ga], ["GD", rec.gd > 0 ? `+${rec.gd}` : rec.gd], ["Pts", rec.pts]].map(([k, v]) => (
            <div key={k}><b>{v}</b><small>{k}</small></div>
          ))}
        </div>
        {rec.p > 0 && (
          <div className="form-row">
            <small className="muted">Form</small>
            {form(team).map((r, i) => <span key={i} className={`f-${r}`}>{r}</span>)}
          </div>
        )}
      </section>

      {rec.p > 0 && (
        <div className="grid3">
          {boards.map(b => (
            <button key={b.key} className="card leader" onClick={() => go("stats")}>
              <small>{b.title}</small>
              {b.top && b.top.value > 0 ? <>
                <Avatar player={b.top.player} size={52} />
                <b>{b.top.player.name}</b>
                <span className="big-num">{b.top.value} <small>{b.unit}</small></span>
              </> : <span className="muted">—</span>}
            </button>
          ))}
        </div>
      )}

      {sharing && (
        <ShareModal
          title={sharing.kind === "result" ? "Share result" : "Share fixture"}
          filename={`${team.name}-${sharing.kind}.png`}
          caption={sharing.kind === "result"
            ? `FT: ${team.name} ${sharing.match.gf}-${sharing.match.ga} ${sharing.match.opponent}`
            : `Next up: ${team.name} vs ${sharing.match.opponent}, ${prettyDate(sharing.match.date)}${sharing.match.time ? ` ${sharing.match.time}` : ""}`}
          onClose={() => setSharing(null)}>
          {sharing.kind === "result" ? <ResultCard team={team} match={sharing.match} /> : <FixtureCard team={team} match={sharing.match} />}
        </ShareModal>
      )}
    </div>
  );
}
