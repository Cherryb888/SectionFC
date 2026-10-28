import { useState } from "react";
import { FineCard } from "../cards";
import { money, prettyDate } from "../stats";
import { uid } from "../store";
import { Avatar, Empty, Field, Modal, ShareModal } from "../ui";
import { payUrl } from "./Subs";

// The presets on the quick-add buttons until the manager changes them.
export const DEFAULT_FINE_TYPES = [
  { id: "late",    emoji: "⏰", label: "Late",              amount: 2 },
  { id: "noshow",  emoji: "🚫", label: "No-show",           amount: 5 },
  { id: "yellow",  emoji: "🟨", label: "Yellow card",       amount: 2 },
  { id: "red",     emoji: "🟥", label: "Red card",          amount: 5 },
  { id: "kit",     emoji: "👕", label: "Forgot kit",        amount: 2 },
  { id: "owngoal", emoji: "🙈", label: "Own goal",          amount: 1 },
  { id: "pen",     emoji: "🥅", label: "Missed penalty",    amount: 2 },
  { id: "mouth",   emoji: "🗣️", label: "Back-chatting ref", amount: 3 },
];

const today = () => new Date().toISOString().slice(0, 10);

export function fineTotals(team) {
  const rows = Object.fromEntries(team.players.map(p => [p.id, { count: 0, total: 0, owed: 0 }]));
  (team.fines || []).forEach(f => {
    const r = rows[f.playerId];
    if (!r) return;
    r.count++; r.total += f.amount;
    if (!f.paid) r.owed += f.amount;
  });
  return rows;
}

export default function Fines({ team, admin, save, requirePaid }) {
  const [adding, setAdding] = useState(false);
  const [editingTypes, setEditingTypes] = useState(false);
  const [sharing, setSharing] = useState(null);
  const [filter, setFilter] = useState("all");
  const fines = [...(team.fines || [])].sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.createdAt - a.createdAt);
  const byId = Object.fromEntries(team.players.map(p => [p.id, p]));
  const totals = fineTotals(team);
  const link = team.settings?.payLink;
  const kitty = fines.filter(f => f.paid).reduce((n, f) => n + f.amount, 0);
  const owed = fines.filter(f => !f.paid).reduce((n, f) => n + f.amount, 0);
  const table = team.players.filter(p => totals[p.id].count > 0)
    .sort((a, b) => totals[b.id].total - totals[a.id].total || totals[b.id].count - totals[a.id].count);
  const shown = fines.filter(f => byId[f.playerId] && (filter === "all" || (filter === "unpaid" ? !f.paid : f.playerId === filter)));

  if (!team.paid) return (
    <Empty icon="🧾" title="The fines kitty">
      <p className="muted">Fine players for turning up late, forgetting kit or that open-goal miss. Everyone sees the fine and the manager's note, and pays in one tap.</p>
      {admin
        ? <button className="btn primary" onClick={() => requirePaid("fines")}>Unlock fines</button>
        : <p className="muted small">Your manager can switch this on.</p>}
    </Empty>
  );

  const setFines = (list, msg) => save({ fines: list }, msg);
  const togglePaid = f => setFines((team.fines || []).map(x => x.id === f.id ? { ...x, paid: !x.paid, paidAt: x.paid ? null : Date.now() } : x),
    f.paid ? "Marked unpaid" : "Marked paid");
  const remove = f => confirm(`Scrap ${byId[f.playerId]?.name}'s ${f.reason} fine?`) &&
    setFines((team.fines || []).filter(x => x.id !== f.id), "Fine scrapped");
  const payAll = pid => setFines((team.fines || []).map(x => x.playerId === pid && !x.paid ? { ...x, paid: true, paidAt: Date.now() } : x), "All paid up");
  const reminder = () => {
    const lines = table.filter(p => totals[p.id].owed > 0).map(p => `• ${p.name}: ${money(totals[p.id].owed)}`);
    return `🧾 Fines owed\n${lines.join("\n")}${link ? `\n\nPay here: ${payUrl(link)}` : ""}`;
  };

  return (
    <div className="stack">
      <div className="grid2 kitty">
        <div className="card"><small className="muted">In the kitty</small><span className="big-num">{money(kitty)}</span></div>
        <div className="card"><small className="muted">Still owed</small><span className="big-num owe">{money(owed)}</span></div>
      </div>

      {admin && (
        <div className="row gap">
          <button className="btn primary grow" onClick={() => setAdding(true)} disabled={!team.players.length}>🧾 Dish out a fine</button>
          <button className="btn ghost" onClick={() => setEditingTypes(true)}>Presets</button>
        </div>
      )}
      {!team.players.length && <p className="muted small">Add players in the Squad tab first.</p>}

      {table.length > 0 && (
        <section className="card">
          <div className="card-head"><h3>Fines table</h3>
            {admin && owed > 0 && <a className="link small" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(reminder())}`}>Send reminder</a>}
          </div>
          {table.map((p, i) => (
            <div key={p.id} className="owe-row">
              <span className="rank">{i + 1}</span>
              <Avatar player={p} size={34} />
              <span className="grow"><b>{p.name}</b><small className="muted">{totals[p.id].count} fine{totals[p.id].count > 1 ? "s" : ""}</small></span>
              <span className="fine-sum"><b>{money(totals[p.id].total)}</b>{totals[p.id].owed > 0 && <small className="owe">{money(totals[p.id].owed)} owed</small>}</span>
              {totals[p.id].owed > 0 && link && <a className="btn sm primary" href={payUrl(link, totals[p.id].owed)} target="_blank" rel="noreferrer">Pay</a>}
              {totals[p.id].owed > 0 && admin && <button className="btn sm ghost" onClick={() => payAll(p.id)}>Paid</button>}
            </div>
          ))}
        </section>
      )}

      {fines.length > 0 && <>
        <div className="row gap wrap">
          <h3 className="section-title grow">Every fine</h3>
          <select className="filter" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Everyone</option>
            <option value="unpaid">Unpaid only</option>
            {table.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {shown.map(f => {
          const p = byId[f.playerId];
          return (
            <div key={f.id} className={`fine ${f.paid ? "paid" : ""}`}>
              <Avatar player={p} size={42} />
              <div className="fine-body">
                <div className="fine-top">
                  <b>{p.name}</b>
                  <span className="fine-amt">{money(f.amount)}</span>
                </div>
                <span className="fine-reason">{f.emoji} {f.reason}</span>
                {f.note && <p className="fine-note">“{f.note}” <small>— the gaffer</small></p>}
                <div className="fine-foot">
                  <small className="muted">{prettyDate(f.date)}</small>
                  <span className={`tag ${f.paid ? "ok" : "due"}`}>{f.paid ? "Paid" : "Unpaid"}</span>
                  <span className="grow" />
                  <button className="link small" onClick={() => setSharing(f)}>Share</button>
                  {!f.paid && link && <a className="link small" href={payUrl(link, f.amount)} target="_blank" rel="noreferrer">Pay</a>}
                  {admin && <button className="link small" onClick={() => togglePaid(f)}>{f.paid ? "Undo paid" : "Mark paid"}</button>}
                  {admin && <button className="link small danger-link" onClick={() => remove(f)}>Scrap</button>}
                </div>
              </div>
            </div>
          );
        })}
        {!shown.length && <p className="muted small center">Nothing here.</p>}
      </>}

      {!fines.length && (
        <Empty icon="😇" title="A clean record, for now">
          <p className="muted">{admin ? "Tap Dish out a fine. Pick who, pick why, add a note." : "No fines yet. Keep it that way."}</p>
        </Empty>
      )}
      {admin && !link && fines.length > 0 && <p className="muted small center">Add your payment link in Settings so players can pay fines in one tap.</p>}

      {adding && <QuickAdd team={team} onClose={() => setAdding(false)} onAdd={async (list, msg) => {
        if (await setFines([...(team.fines || []), ...list], msg)) return true;
        return false;
      }} />}
      {editingTypes && <Presets team={team} onClose={() => setEditingTypes(false)} onSave={async types => {
        if (await save({ fineTypes: types }, "Presets saved")) setEditingTypes(false);
      }} />}
      {sharing && (
        <ShareModal title="Share fine" filename={`${team.name}-fine.png`} onClose={() => setSharing(null)}
          caption={`🧾 FINED: ${byId[sharing.playerId]?.name}, ${sharing.reason} (${money(sharing.amount)})${sharing.note ? `. "${sharing.note}"` : ""}`}>
          <FineCard team={team} fine={sharing} player={byId[sharing.playerId]} />
        </ShareModal>
      )}
    </div>
  );
}

// Pick a reason, pick who, add a note, fine them. Stays open afterwards so
// the manager can work through the whole night's crimes in one go.
function QuickAdd({ team, onAdd, onClose }) {
  const types = team.fineTypes?.length ? team.fineTypes : DEFAULT_FINE_TYPES;
  const [type, setType] = useState(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [who, setWho] = useState([]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);

  const pick = t => { setType(t.id); setReason(t.label); setAmount(String(t.amount)); };
  const toggle = id => setWho(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]);
  const amt = Math.round((Number(amount) || 0) * 100) / 100;
  const ready = who.length && reason.trim() && amt > 0;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    const emoji = types.find(t => t.id === type && t.label === reason)?.emoji || "🧾";
    const list = who.map(playerId => ({
      id: uid(), playerId, reason: reason.trim(), emoji, amount: amt, note: note.trim(), date, paid: false, createdAt: Date.now(),
    }));
    const ok = await onAdd(list, `${who.length} fine${who.length > 1 ? "s" : ""} dished out`);
    setBusy(false);
    if (ok) { setDone(d => d + list.length); setWho([]); setNote(""); setType(null); setReason(""); setAmount(""); }
  };

  return (
    <Modal title="Dish out a fine" onClose={onClose} wide>
      <h4 className="section-title">What for?</h4>
      <div className="fine-types">
        {types.map(t => (
          <button key={t.id} type="button" className={`ftype ${type === t.id ? "on" : ""}`} onClick={() => pick(t)}>
            <span>{t.emoji}</span><b>{t.label}</b><small>{money(t.amount)}</small>
          </button>
        ))}
      </div>
      <div className="grid2">
        <Field label="Reason"><input value={reason} onChange={e => { setReason(e.target.value); setType(null); }} placeholder="Or type your own" maxLength={40} /></Field>
        <div className="grid2 tight">
          <Field label="Amount (£)"><input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ""))} /></Field>
          <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        </div>
      </div>

      <h4 className="section-title">Who? <small className="muted">· pick as many as you like</small></h4>
      <div className="chips selectable">
        {team.players.map(p => (
          <button key={p.id} type="button" className={`chip ${who.includes(p.id) ? "on" : ""}`} onClick={() => toggle(p.id)}>{p.name}</button>
        ))}
      </div>

      <Field label="Note from the manager" hint="Everyone sees this with the fine">
        <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="e.g. Rolled up at 8:05 for a 7:50 kick-off. Again." />
      </Field>

      <div className="modal-actions">
        {done > 0 && <span className="muted small">✓ {done} given out</span>}
        <span className="grow" />
        <button className="btn ghost" onClick={onClose}>{done ? "Done" : "Cancel"}</button>
        <button className="btn primary" disabled={!ready || busy} onClick={submit}>
          {who.length > 1 ? `Fine ${who.length} players` : "Fine"}{amt > 0 ? ` ${money(amt)}${who.length > 1 ? " each" : ""}` : ""}
        </button>
      </div>
    </Modal>
  );
}

function Presets({ team, onSave, onClose }) {
  const [types, setTypes] = useState(() => (team.fineTypes?.length ? team.fineTypes : DEFAULT_FINE_TYPES).map(t => ({ ...t })));
  const set = (i, patch) => setTypes(ts => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  return (
    <Modal title="Quick-add presets" onClose={onClose}>
      <p className="muted small">The buttons you tap when dishing out a fine.</p>
      {types.map((t, i) => (
        <div key={t.id} className="preset-row">
          <input className="emoji-in" value={t.emoji} maxLength={4} onChange={e => set(i, { emoji: e.target.value })} aria-label="Emoji" />
          <input value={t.label} maxLength={30} onChange={e => set(i, { label: e.target.value })} aria-label="Reason" />
          <input className="amt-in" inputMode="decimal" value={t.amount} onChange={e => set(i, { amount: e.target.value.replace(/[^\d.]/g, "") })} aria-label="Amount" />
          <button className="icon-btn" onClick={() => setTypes(ts => ts.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
        </div>
      ))}
      <button className="btn ghost block" onClick={() => setTypes(ts => [...ts, { id: uid(), emoji: "🧾", label: "", amount: 1 }])}>＋ Add a preset</button>
      <div className="modal-actions">
        <button className="link small" onClick={() => setTypes(DEFAULT_FINE_TYPES.map(t => ({ ...t })))}>Reset to defaults</button>
        <span className="grow" />
        <button className="btn primary" onClick={() => onSave(types.filter(t => t.label.trim()).map(t => ({ ...t, label: t.label.trim(), amount: Number(t.amount) || 0 })))}>Save</button>
      </div>
    </Modal>
  );
}
