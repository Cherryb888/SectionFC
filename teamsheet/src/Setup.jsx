import { useState } from "react";
import { BRAND } from "./brand";
import { FORMATS, FORMAT_SIZES, defaultFormation } from "./formats";
import { Link, navigate } from "./router";
import { createTeam, newTeam, uid } from "./store";
import { Field, ImagePicker, Crest } from "./ui";

const PALETTES = [
  ["#e8ff00", "#111111"], ["#e10600", "#ffffff"], ["#1d4ed8", "#ffffff"], ["#16a34a", "#ffffff"],
  ["#f97316", "#111111"], ["#7c3aed", "#ffffff"], ["#0ea5e9", "#0b1b2b"], ["#111111", "#f5f5f5"],
  ["#ec4899", "#111111"], ["#facc15", "#1e3a8a"],
];

const STEPS = ["Format", "Team", "Squad", "Season"];

// "7 Sam Okafor GK" or "Sam Okafor" per line, the way squads get pasted out
// of a group chat. A leading number is the shirt number, a trailing
// GK/DEF/MID/ATT is the position.
export function parseSquad(text) {
  return text.split(/\n|,/).map(l => l.trim()).filter(Boolean).map(line => {
    let number = "", pos = "";
    const num = line.match(/^#?(\d{1,2})[.)\s-]+/);
    if (num) { number = num[1]; line = line.slice(num[0].length); }
    const p = line.match(/\s+\(?(GK|DEF|MID|ATT|FWD|ST|CB|CM)\)?$/i);
    if (p) {
      const v = p[1].toUpperCase();
      pos = { FWD: "ATT", ST: "ATT", CB: "DEF", CM: "MID" }[v] || v;
      line = line.slice(0, p.index);
    }
    return { id: uid(), name: line.trim(), number, pos, photo: null };
  }).filter(p => p.name);
}

export default function Setup() {
  const [step, setStep] = useState(0);
  const [format, setFormat] = useState(5);
  const [name, setName] = useState("");
  const [colors, setColors] = useState({ primary: PALETTES[0][0], secondary: PALETTES[0][1] });
  const [crest, setCrest] = useState(null);
  const [squadText, setSquadText] = useState("");
  const [seasonName, setSeasonName] = useState(defaultSeasonName());
  const [league, setLeague] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const squad = parseSquad(squadText);
  const canNext = [true, name.trim().length > 1, true, true][step];

  const finish = async () => {
    setBusy(true); setErr("");
    try {
      const team = newTeam({ name, format, colors, crest, season: { name: seasonName, league }, players: squad });
      team.lineup = { formation: defaultFormation(format), slots: [], bench: [] };
      const id = await createTeam(team);
      navigate(`/t/${id}?welcome=1`, { replace: true });
    } catch (e) {
      setErr(e.message || "Couldn't save the team. Try again.");
      setBusy(false);
    }
  };

  const preview = { name: name || "Your Team", crest };

  return (
    <div className="setup" style={{ "--c1": colors.primary, "--c2": colors.secondary }}>
      <nav className="l-nav">
        <Link to="/" className="logo">⚽ {BRAND}</Link>
        <span className="muted small">Step {step + 1} of {STEPS.length}</span>
      </nav>
      <div className="progress">{STEPS.map((s, i) => <span key={s} className={i <= step ? "on" : ""}>{s}</span>)}</div>

      <div className="setup-card">
        {step === 0 && <>
          <h2>What do you play?</h2>
          <p className="muted">You can change this later.</p>
          <div className="format-grid">
            {FORMAT_SIZES.map(n => (
              <button key={n} className={`fmt big ${n === format ? "on" : ""}`} onClick={() => setFormat(n)}>
                <b>{n}</b><small>a-side</small>
              </button>
            ))}
          </div>
          <p className="muted small center">{FORMATS[format].label} · usually {FORMATS[format].squadHint}</p>
        </>}

        {step === 1 && <>
          <h2>Your team</h2>
          <div className="team-preview">
            <Crest team={preview} size={64} />
            <b>{preview.name}</b>
          </div>
          <Field label="Team name">
            <input autoFocus value={name} maxLength={40} onChange={e => setName(e.target.value)} placeholder="e.g. Dynamo Rovers" />
          </Field>
          <Field label="Colours">
            <div className="swatches">
              {PALETTES.map(([a, b]) => (
                <button key={a + b} type="button"
                  className={`swatch ${colors.primary === a && colors.secondary === b ? "on" : ""}`}
                  style={{ background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }}
                  onClick={() => setColors({ primary: a, secondary: b })} aria-label={`${a} and ${b}`} />
              ))}
              <span className="custom-colors">
                <input type="color" value={colors.primary} onChange={e => setColors(c => ({ ...c, primary: e.target.value }))} aria-label="Main colour" />
                <input type="color" value={colors.secondary} onChange={e => setColors(c => ({ ...c, secondary: e.target.value }))} aria-label="Second colour" />
              </span>
            </div>
          </Field>
          <Field label="Crest or logo" hint="Optional. We'll use your initials until you add one.">
            <ImagePicker value={crest} onChange={setCrest} label="Crest" round={false} size={256} />
          </Field>
        </>}

        {step === 2 && <>
          <h2>Your squad</h2>
          <p className="muted">Paste names from the group chat, one per line. Add a shirt number in front or a position after if you like. Photos come later.</p>
          <textarea rows={9} value={squadText} onChange={e => setSquadText(e.target.value)}
            placeholder={"1 Jordan Hale GK\n4 Sam Okafor\nLuca Reid MID\nPriya Patel\n…"} />
          <p className="muted small">{squad.length ? `${squad.length} player${squad.length > 1 ? "s" : ""}` : "You can skip this and add players later."}</p>
          {squad.length > 0 && (
            <div className="chips">{squad.map(p => <span key={p.id} className="chip">{p.number && <b>{p.number}</b>}{p.name}{p.pos && <em>{p.pos}</em>}</span>)}</div>
          )}
        </>}

        {step === 3 && <>
          <h2>This season</h2>
          <Field label="Season name">
            <input value={seasonName} onChange={e => setSeasonName(e.target.value)} placeholder="e.g. Winter 2026" />
          </Field>
          <Field label="League or competition" hint="Optional, e.g. Monday Night Division 1">
            <input value={league} onChange={e => setLeague(e.target.value)} />
          </Field>
          <div className="summary">
            <Crest team={preview} size={44} />
            <div>
              <b>{preview.name}</b>
              <small>{FORMATS[format].label} · {squad.length} players · {seasonName || "Season"}</small>
            </div>
          </div>
          {err && <p className="err">{err}</p>}
        </>}

        <div className="setup-nav">
          {step > 0 ? <button className="btn ghost" onClick={() => setStep(step - 1)}>Back</button> : <Link to="/" className="btn ghost">Cancel</Link>}
          {step < STEPS.length - 1
            ? <button className="btn primary" disabled={!canNext} onClick={() => setStep(step + 1)}>Next</button>
            : <button className="btn primary" disabled={busy} onClick={finish}>{busy ? "Creating…" : "Create team"}</button>}
        </div>
      </div>
    </div>
  );
}

function defaultSeasonName() {
  const d = new Date(), m = d.getMonth(), y = d.getFullYear();
  if (m >= 8) return `${y}/${String(y + 1).slice(2)}`;
  if (m <= 3) return `${y - 1}/${String(y).slice(2)}`;
  return `Summer ${y}`;
}
