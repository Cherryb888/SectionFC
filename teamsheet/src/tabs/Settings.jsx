import { useEffect, useState } from "react";
import { PRICE } from "../billing";
import { FORMATS, FORMAT_SIZES, defaultFormation } from "../formats";
import { navigate } from "../router";
import { leaderboard, playerStats, record, results } from "../stats";
import { CLOUD, DEMO_ID, adminCode, deleteTeam } from "../store";
import { Field, ImagePicker, copyText } from "../ui";

const CLOSE_AWARDS = [
  { key: "goals", title: "Golden Boot", icon: "⚽" },
  { key: "assists", title: "Playmaker", icon: "🎯" },
  { key: "motm", title: "Star Man", icon: "⭐" },
  { key: "apps", title: "Ever Present", icon: "🛡️" },
];

export default function Settings({ id, team, save, toast, requirePaid }) {
  const [f, setF] = useState(() => ({
    name: team.name, colors: team.colors, crest: team.crest, format: team.format,
    seasonName: team.season?.name || "", league: team.season?.league || "",
    matchFee: team.settings?.matchFee || "", payLink: team.settings?.payLink || "",
  }));
  const set = patch => setF(x => ({ ...x, ...patch }));
  const [code, setCode] = useState(null);
  useEffect(() => { if (CLOUD && id !== DEMO_ID) adminCode(id).then(setCode).catch(() => {}); }, [id]);

  const submit = e => {
    e.preventDefault();
    if (!f.name.trim()) return;
    const patch = {
      name: f.name.trim(), colors: f.colors, crest: f.crest, format: f.format,
      season: { name: f.seasonName, league: f.league },
      settings: { matchFee: f.matchFee, payLink: f.payLink.trim() },
    };
    if (f.format !== team.format) patch.lineup = { formation: defaultFormation(f.format), slots: [], bench: [] };
    save(patch, "Settings saved");
  };

  const newSeason = async () => {
    if (!team.paid) return requirePaid("season");
    const name = prompt("Name the new season", "");
    if (name === null) return;
    const stats = playerStats(team);
    const closed = {
      name: team.season?.name, league: team.season?.league, closedAt: Date.now(),
      record: record(team),
      awards: CLOSE_AWARDS.map(a => {
        const top = leaderboard(team, a.key, stats)[0];
        return top && top.value > 0 ? { ...a, name: top.player.name, value: top.value } : null;
      }).filter(Boolean),
      matches: results(team),
    };
    if (await save({
      archive: [...(team.archive || []), closed],
      matches: team.matches.filter(m => m.status !== "result"),
      payments: {},
      season: { ...team.season, name },
    }, `${name || "New season"} started`)) set({ seasonName: name });
  };

  const inviteUrl = code && `${window.location.origin}/t/${id}?join=${code}`;

  return (
    <div className="stack">
      <form className="card" onSubmit={submit}>
        <div className="card-head"><h3>Team</h3></div>
        <div className="row gap">
          <ImagePicker value={f.crest} onChange={crest => set({ crest })} label="Crest" round={false} size={256} />
          <div className="grow">
            <Field label="Name"><input value={f.name} onChange={e => set({ name: e.target.value })} maxLength={40} /></Field>
            <Field label="Colours">
              <span className="custom-colors">
                <input type="color" value={f.colors.primary} onChange={e => set({ colors: { ...f.colors, primary: e.target.value } })} aria-label="Main colour" />
                <input type="color" value={f.colors.secondary} onChange={e => set({ colors: { ...f.colors, secondary: e.target.value } })} aria-label="Second colour" />
              </span>
            </Field>
          </div>
        </div>
        <Field label="Format" hint={f.format !== team.format ? "Changing format resets the saved lineup." : undefined}>
          <select value={f.format} onChange={e => set({ format: Number(e.target.value) })}>
            {FORMAT_SIZES.map(n => <option key={n} value={n}>{FORMATS[n].label}</option>)}
          </select>
        </Field>
        <div className="grid2">
          <Field label="Season"><input value={f.seasonName} onChange={e => set({ seasonName: e.target.value })} /></Field>
          <Field label="League"><input value={f.league} onChange={e => set({ league: e.target.value })} /></Field>
        </div>

        <div className="card-head"><h3>Subs and fines</h3></div>
        <div className="grid2">
          <Field label="Match fee (£)"><input inputMode="decimal" value={f.matchFee} onChange={e => set({ matchFee: e.target.value.replace(/[^\d.]/g, "") })} placeholder="e.g. 6" /></Field>
          <Field label="Your payment link" hint="Players pay subs and fines here. monzo.me/you or paypal.me/you get the amount filled in">
            <input value={f.payLink} onChange={e => set({ payLink: e.target.value })} placeholder="monzo.me/yourname" />
          </Field>
        </div>
        <button className="btn primary block">Save settings</button>
      </form>

      <section className="card">
        <div className="card-head"><h3>Plan</h3></div>
        {team.paid
          ? <p>✅ Unlocked. Thanks for backing us.</p>
          : <><p className="muted">Free trial.</p><button className="btn primary" onClick={() => requirePaid("full")}>Unlock for {PRICE}</button></>}
      </section>

      {CLOUD && id !== DEMO_ID && (
        <section className="card">
          <div className="card-head"><h3>Co-managers</h3></div>
          <p className="muted small">Anyone who opens this link can edit the team. Only send it to people you trust.</p>
          {inviteUrl ? (
            <div className="linkbox"><code>{inviteUrl}</code>
              <button className="btn sm" onClick={async () => toast(await copyText(inviteUrl) ? "Invite link copied" : "Copy it from the box")}>Copy</button>
            </div>
          ) : <p className="muted small">Loading…</p>}
        </section>
      )}

      <section className="card">
        <div className="card-head"><h3>Season</h3></div>
        <p className="muted small">Closing the season saves its record and award winners under Past seasons, then clears the results for a fresh start. Your squad and fixtures stay.</p>
        <button className="btn ghost" onClick={newSeason}>Close season and start a new one</button>
      </section>

      <section className="card danger-zone">
        <div className="card-head"><h3>Delete team</h3></div>
        <p className="muted small">Removes the team, its squad and every result. This can't be undone.</p>
        <button className="btn danger" onClick={async () => {
          if (prompt(`Type the team name to delete it: ${team.name}`) !== team.name) return;
          try { await deleteTeam(id); navigate("/", { replace: true }); } catch { toast("Couldn't delete. Only the team's creator can."); }
        }}>Delete {team.name}</button>
      </section>
    </div>
  );
}
