import { useState } from "react";
import { canAddResult } from "../billing";
import { ResultCard } from "../cards";
import { fixtures, outcome, prettyDate, results } from "../stats";
import { uid } from "../store";
import { Avatar, Empty, Field, Modal, ShareModal, Stepper } from "../ui";

export default function Matches({ team, admin, save, requirePaid }) {
  const [editing, setEditing] = useState(null);
  const [sharing, setSharing] = useState(null);
  const res = [...results(team)].reverse();
  const fix = fixtures(team);

  const saveMatch = async m => {
    const isNewResult = m.status === "result" && team.matches.find(x => x.id === m.id)?.status !== "result";
    if (isNewResult && !canAddResult(team, results(team).length)) { requirePaid("results"); return; }
    const exists = team.matches.some(x => x.id === m.id);
    const matches = exists ? team.matches.map(x => (x.id === m.id ? m : x)) : [...team.matches, m];
    if (await save({ matches }, m.status === "result" ? "Result saved. Stats updated." : "Fixture saved")) setEditing(null);
  };
  const remove = async m => {
    if (!confirm(`Delete the game against ${m.opponent}? Its stats go too.`)) return;
    const payments = { ...team.payments };
    delete payments[m.id];
    if (await save({ matches: team.matches.filter(x => x.id !== m.id), payments }, "Deleted")) setEditing(null);
  };

  return (
    <div className="stack">
      {admin && (
        <button className="btn primary block" onClick={() => setEditing({ id: uid(), status: "fixture", opponent: "", date: "", time: "", venue: "", home: true })}>
          ＋ Add a fixture
        </button>
      )}

      {fix.length === 0 && res.length === 0 && (
        <Empty icon="📅" title="No games yet">
          <p className="muted">{admin ? "Add your next fixture. After the game, open it to add the score and who scored." : "Fixtures and results will show here."}</p>
        </Empty>
      )}

      {fix.length > 0 && <>
        <h3 className="section-title">Coming up</h3>
        {fix.map(m => (
          <div key={m.id} className="match-row">
            <div className="mr-date"><b>{prettyDate(m.date)}</b><small>{m.time}</small></div>
            <div className="mr-main"><b>{m.home !== false ? "vs" : "@"} {m.opponent}</b>{m.venue && <small>📍 {m.venue}</small>}</div>
            {admin && <button className="btn sm" onClick={() => setEditing({ ...m, status: "result", gf: m.gf ?? 0, ga: m.ga ?? 0 })}>Add result</button>}
            {admin && <button className="icon-btn" onClick={() => setEditing(m)} aria-label="Edit">✎</button>}
          </div>
        ))}
      </>}

      {res.length > 0 && <>
        <h3 className="section-title">Results</h3>
        {res.map(m => (
          <div key={m.id} className={`match-row result r-${outcome(m)}`}>
            <span className="badge">{outcome(m)}</span>
            <div className="mr-main">
              <b>{m.gf} – {m.ga} <span className="muted">{m.home !== false ? "vs" : "@"} {m.opponent}</span></b>
              <small>{prettyDate(m.date)}{scorerLine(team, m) && ` · ⚽ ${scorerLine(team, m)}`}</small>
              {m.report && <p className="report">{m.report}</p>}
            </div>
            <button className="icon-btn" onClick={() => setSharing(m)} aria-label="Share">↗</button>
            {admin && <button className="icon-btn" onClick={() => setEditing(m)} aria-label="Edit">✎</button>}
          </div>
        ))}
      </>}

      {editing && <MatchEditor team={team} match={editing} onSave={saveMatch} onDelete={remove} onClose={() => setEditing(null)} />}
      {sharing && (
        <ShareModal title="Share result" filename={`${team.name}-result.png`}
          caption={`FT: ${team.name} ${sharing.gf}-${sharing.ga} ${sharing.opponent}`} onClose={() => setSharing(null)}>
          <ResultCard team={team} match={sharing} />
        </ShareModal>
      )}
    </div>
  );
}

function scorerLine(team, m) {
  return team.players
    .filter(p => m.events?.[p.id]?.goals > 0)
    .map(p => `${p.name.split(" ").slice(-1)[0]}${m.events[p.id].goals > 1 ? ` ${m.events[p.id].goals}` : ""}`)
    .join(", ");
}

function MatchEditor({ team, match, onSave, onDelete, onClose }) {
  const [m, setM] = useState(() => ({
    events: {}, ...match,
    // A new result starts with the lineup from the Lineup tab ticked.
    played: match.played?.length ? match.played
      : match.status === "result" ? [...(team.lineup?.slots || []), ...(team.lineup?.bench || [])].filter(id => team.players.some(p => p.id === id))
      : [],
  }));
  const set = patch => setM(x => ({ ...x, ...patch }));
  const setEv = (pid, key, v) => set({ events: { ...m.events, [pid]: { ...m.events[pid], [key]: v } } });
  const togglePlayed = pid => set({ played: m.played.includes(pid) ? m.played.filter(x => x !== pid) : [...m.played, pid] });
  const isResult = m.status === "result";
  const exists = team.matches.some(x => x.id === m.id);
  const played = team.players.filter(p => m.played.includes(p.id));
  const goalsIn = played.reduce((n, p) => n + (m.events[p.id]?.goals || 0), 0);
  const keeper = m.keeper && m.played.includes(m.keeper) ? m.keeper
    : played.find(p => p.pos === "GK")?.id || "";

  return (
    <Modal title={isResult ? `Result vs ${m.opponent || "…"}` : exists ? "Edit fixture" : "New fixture"} onClose={onClose} wide>
      <form onSubmit={e => {
        e.preventDefault();
        if (!m.opponent.trim()) return;
        onSave({ ...m, opponent: m.opponent.trim(), keeper: isResult ? keeper : m.keeper,
          gf: isResult ? Number(m.gf) || 0 : m.gf, ga: isResult ? Number(m.ga) || 0 : m.ga });
      }}>
        <div className="grid2">
          <Field label="Opponent"><input value={m.opponent} onChange={e => set({ opponent: e.target.value })} required autoFocus={!exists} /></Field>
          <Field label="Home or away">
            <div className="seg">
              <button type="button" className={m.home !== false ? "on" : ""} onClick={() => set({ home: true })}>Home</button>
              <button type="button" className={m.home === false ? "on" : ""} onClick={() => set({ home: false })}>Away</button>
            </div>
          </Field>
          <Field label="Date"><input type="date" value={m.date} onChange={e => set({ date: e.target.value })} /></Field>
          <Field label="Kick-off"><input type="time" value={m.time} onChange={e => set({ time: e.target.value })} /></Field>
        </div>
        <Field label="Venue / pitch"><input value={m.venue || ""} onChange={e => set({ venue: e.target.value })} placeholder="e.g. Powerleague, Pitch 3" /></Field>

        {isResult && <>
          <div className="score-entry">
            <div><small>{team.name}</small><Stepper value={Number(m.gf) || 0} onChange={v => set({ gf: v })} /></div>
            <span>–</span>
            <div><small>{m.opponent || "Them"}</small><Stepper value={Number(m.ga) || 0} onChange={v => set({ ga: v })} /></div>
          </div>

          <h4 className="section-title">Who played?</h4>
          {team.players.length === 0 && <p className="muted small">Add players in the Squad tab to track their stats.</p>}
          <div className="chips selectable">
            {team.players.map(p => (
              <button type="button" key={p.id} className={`chip ${m.played.includes(p.id) ? "on" : ""}`} onClick={() => togglePlayed(p.id)}>
                {p.name}
              </button>
            ))}
          </div>

          {played.length > 0 && <>
            <h4 className="section-title">
              Goals, assists and cards
              {goalsIn !== (Number(m.gf) || 0) && <small className="warn"> · {goalsIn} of {Number(m.gf) || 0} goals given out</small>}
            </h4>
            <div className="ev-table">
              <div className="ev-head"><span /><span>Goals</span><span>Assists</span><span>🟨</span><span>🟥</span></div>
              {played.map(p => (
                <div key={p.id} className="ev-row">
                  <span className="ev-name"><Avatar player={p} size={26} />{p.name}</span>
                  {["goals", "assists", "yellows", "reds"].map(k => (
                    <Stepper key={k} value={m.events[p.id]?.[k] || 0} max={k === "yellows" ? 2 : k === "reds" ? 1 : 30} onChange={v => setEv(p.id, k, v)} />
                  ))}
                </div>
              ))}
            </div>
            <div className="grid2">
              <Field label="Man of the Match">
                <select value={m.motm || ""} onChange={e => set({ motm: e.target.value })}>
                  <option value="">—</option>
                  {played.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="In goal" hint={Number(m.ga) === 0 ? "Gets the clean sheet" : undefined}>
                <select value={keeper} onChange={e => set({ keeper: e.target.value })}>
                  <option value="">—</option>
                  {played.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            </div>
          </>}
          <Field label="Match report" hint="Optional. Shows under the result.">
            <textarea rows={3} value={m.report || ""} onChange={e => set({ report: e.target.value })} placeholder="How did it go?" />
          </Field>
        </>}

        <div className="modal-actions">
          {exists && <button type="button" className="btn danger" onClick={() => onDelete(m)}>Delete</button>}
          <span className="grow" />
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary">{isResult ? "Save result" : "Save fixture"}</button>
        </div>
      </form>
    </Modal>
  );
}
