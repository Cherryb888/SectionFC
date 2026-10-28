import { useState } from "react";
import { POSITIONS } from "../formats";
import { playerStats } from "../stats";
import { uid } from "../store";
import { Avatar, Empty, Field, ImagePicker, Modal } from "../ui";
import { parseSquad } from "../Setup";

const POS_ORDER = { GK: 0, DEF: 1, MID: 2, ATT: 3, "": 4 };

export default function Squad({ team, admin, save }) {
  const [editing, setEditing] = useState(null);
  const [bulk, setBulk] = useState(false);
  const [viewing, setViewing] = useState(null);
  const stats = playerStats(team);
  const players = [...team.players].sort((a, b) =>
    (POS_ORDER[a.pos || ""] - POS_ORDER[b.pos || ""]) || (Number(a.number) || 99) - (Number(b.number) || 99) || a.name.localeCompare(b.name));

  const savePlayer = async p => {
    const exists = team.players.some(x => x.id === p.id);
    const list = exists ? team.players.map(x => (x.id === p.id ? p : x)) : [...team.players, p];
    if (await save({ players: list }, exists ? "Player updated" : `${p.name} added`)) setEditing(null);
  };
  const removePlayer = async p => {
    const used = team.matches.some(m => m.played?.includes(p.id));
    if (!confirm(used
      ? `Remove ${p.name}? They've played this season, so their goals and appearances come off the stats too.`
      : `Remove ${p.name} from the squad?`)) return;
    if (await save({ players: team.players.filter(x => x.id !== p.id) }, `${p.name} removed`)) setEditing(null);
  };

  return (
    <div className="stack">
      {admin && (
        <div className="row gap">
          <button className="btn primary grow" onClick={() => setEditing({ id: uid(), name: "", number: "", pos: "", photo: null })}>＋ Add player</button>
          <button className="btn ghost" onClick={() => setBulk(true)}>Paste a list</button>
        </div>
      )}
      {players.length === 0 && (
        <Empty icon="👕" title="No players yet">
          <p className="muted">{admin ? "Add your squad, with photos if you've got them." : "The squad will show here."}</p>
        </Empty>
      )}
      <div className="squad-grid">
        {players.map(p => (
          <button key={p.id} className="pcard" onClick={() => (admin ? setEditing(p) : setViewing(p))}>
            <div className="pcard-photo">
              <Avatar player={p} size={84} />
              {p.number && <span className="pcard-num">{p.number}</span>}
            </div>
            <b>{p.name}</b>
            <small>{p.pos || "Player"}{p.role ? ` · ${p.role}` : ""}</small>
            <div className="pcard-stats">
              <span><b>{stats[p.id]?.apps || 0}</b>apps</span>
              <span><b>{stats[p.id]?.goals || 0}</b>goals</span>
              <span><b>{stats[p.id]?.assists || 0}</b>ast</span>
            </div>
          </button>
        ))}
      </div>

      {editing && <PlayerEditor player={editing} isNew={!team.players.some(x => x.id === editing.id)} onSave={savePlayer} onDelete={removePlayer} onClose={() => setEditing(null)} />}
      {bulk && <BulkAdd onClose={() => setBulk(false)} onAdd={async list => {
        if (await save({ players: [...team.players, ...list] }, `${list.length} players added`)) setBulk(false);
      }} />}
      {viewing && <PlayerView player={viewing} stats={stats[viewing.id]} onClose={() => setViewing(null)} />}
    </div>
  );
}

function PlayerEditor({ player, isNew, onSave, onDelete, onClose }) {
  const [p, setP] = useState(player);
  const set = patch => setP(x => ({ ...x, ...patch }));
  return (
    <Modal title={isNew ? "New player" : p.name} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (p.name.trim()) onSave({ ...p, name: p.name.trim() }); }}>
        <div className="center-col"><ImagePicker value={p.photo} onChange={photo => set({ photo })} /></div>
        <Field label="Name"><input value={p.name} onChange={e => set({ name: e.target.value })} required autoFocus={isNew} maxLength={40} /></Field>
        <div className="grid2">
          <Field label="Shirt number"><input inputMode="numeric" value={p.number} maxLength={2} onChange={e => set({ number: e.target.value.replace(/\D/g, "") })} /></Field>
          <Field label="Position">
            <select value={p.pos} onChange={e => set({ pos: e.target.value })}>
              <option value="">Any</option>
              {POSITIONS.map(x => <option key={x}>{x}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Role" hint="Optional, e.g. Captain, Manager, Injured">
          <input value={p.role || ""} maxLength={24} onChange={e => set({ role: e.target.value })} />
        </Field>
        <div className="modal-actions">
          {!isNew && <button type="button" className="btn danger" onClick={() => onDelete(p)}>Remove</button>}
          <span className="grow" />
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary">{isNew ? "Add" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

function BulkAdd({ onAdd, onClose }) {
  const [text, setText] = useState("");
  const list = parseSquad(text);
  return (
    <Modal title="Paste a list" onClose={onClose}>
      <p className="muted small">One player per line. A number in front is the shirt number; GK, DEF, MID or ATT after is the position.</p>
      <textarea rows={8} value={text} onChange={e => setText(e.target.value)} autoFocus placeholder={"9 Sam Okafor ATT\nLuca Reid"} />
      <div className="modal-actions">
        <span className="grow muted small">{list.length} players</span>
        <button className="btn primary" disabled={!list.length} onClick={() => onAdd(list)}>Add {list.length || ""}</button>
      </div>
    </Modal>
  );
}

function PlayerView({ player, stats = {}, onClose }) {
  return (
    <Modal title={player.name} onClose={onClose}>
      <div className="center-col">
        <Avatar player={player} size={120} />
        <p className="muted">{[player.number && `#${player.number}`, player.pos, player.role].filter(Boolean).join(" · ") || "Player"}</p>
      </div>
      <div className="record">
        {[["Apps", stats.apps], ["Goals", stats.goals], ["Assists", stats.assists], ["MOTM", stats.motm], ["Clean sheets", stats.cs]].map(([k, v]) => (
          <div key={k}><b>{v || 0}</b><small>{k}</small></div>
        ))}
      </div>
    </Modal>
  );
}
