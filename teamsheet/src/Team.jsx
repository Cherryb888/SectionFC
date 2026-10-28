import { useCallback, useEffect, useState } from "react";
import { BRAND } from "./brand";
import { PRICE, FREE_RESULTS, SIMULATED, unlock } from "./billing";
import { FORMATS } from "./formats";
import { Link, navigate } from "./router";
import { CLOUD, DEMO_ID, joinAsAdmin, saveTeam, useIsAdmin, useTeam } from "./store";
import { Crest, Modal, copyText, useToast } from "./ui";
import Home from "./tabs/Home";
import Matches from "./tabs/Matches";
import Squad from "./tabs/Squad";
import Stats from "./tabs/Stats";
import Lineup from "./tabs/Lineup";
import Subs from "./tabs/Subs";
import Fines from "./tabs/Fines";
import Settings from "./tabs/Settings";

const TABS = [
  { id: "home",     label: "Home",     el: Home },
  { id: "matches",  label: "Matches",  el: Matches },
  { id: "squad",    label: "Squad",    el: Squad },
  { id: "stats",    label: "Stats",    el: Stats },
  { id: "lineup",   label: "Lineup",   el: Lineup },
  { id: "subs",     label: "Subs",     el: Subs },
  { id: "fines",    label: "Fines",    el: Fines },
  { id: "settings", label: "Settings", el: Settings, admin: true },
];

// Black or white text, whichever reads better on the team's colour.
const ink = hex => {
  const n = parseInt((hex || "#000").slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111" : "#fff";
};

export default function Team({ id, tab = "home", query }) {
  const { team, loading, error } = useTeam(id);
  const [admin, setAdmin] = useIsAdmin(id);
  const [toast, toastNode] = useToast();
  const [paywall, setPaywall] = useState(null);
  const [welcome, setWelcome] = useState(query.get("welcome") === "1");

  // Co-manager invite: /t/<id>?join=<code>
  useEffect(() => {
    const code = query.get("join");
    if (!code || !CLOUD) return;
    joinAsAdmin(id, code).then(ok => {
      if (ok) { setAdmin(true); toast("You're a manager of this team now"); }
      else toast("That invite link didn't work. Ask for a new one.");
      navigate(`/t/${id}`, { replace: true });
    });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Back from Stripe. The webhook marks the team paid, usually within seconds.
  useEffect(() => {
    if (query.get("paid") === "1") { toast("Payment received. Unlocking…"); navigate(`/t/${id}`, { replace: true }); }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async (patch, msg) => {
    try { await saveTeam(id, patch); if (msg) toast(msg); return true; }
    catch (e) { toast(e.message || "Couldn't save. Check your connection."); return false; }
  }, [id, toast]);

  if (loading) return <div className="center-screen"><div className="spinner" /></div>;
  if (error || !team) return (
    <div className="center-screen">
      <h2>{error ? "Couldn't load this team" : "Team not found"}</h2>
      <p className="muted">{error ? "Check your connection and try again." : "The link might be wrong, or the team was deleted."}</p>
      <Link to="/" className="btn primary">Go to {BRAND}</Link>
    </div>
  );

  const tabs = TABS.filter(t => !t.admin || admin);
  const current = tabs.find(t => t.id === tab) || tabs[0];
  const Tab = current.el;
  const share = async () => {
    const url = `${window.location.origin}/t/${id}`;
    if (navigator.share) { try { await navigator.share({ title: team.name, url }); return; } catch { /* fall through */ } }
    toast(await copyText(url) ? "Team link copied" : url);
  };

  const ctx = {
    id, team, admin, save, toast,
    requirePaid: reason => setPaywall(reason),
    go: t => navigate(`/t/${id}/${t}`),
  };

  return (
    <div className="team" style={{ "--c1": team.colors.primary, "--c2": team.colors.secondary, "--ink": ink(team.colors.primary) }}>
      <header className="t-head">
        <div className="t-band" />
        <div className="t-id">
          <Crest team={team} size={56} />
          <div className="t-name">
            <h1>{team.name}</h1>
            <small>{[team.season?.league, team.season?.name, FORMATS[team.format]?.label].filter(Boolean).join(" · ")}</small>
          </div>
          <button className="icon-btn share-btn" onClick={share} aria-label="Share team link">↗</button>
        </div>
        {id === DEMO_ID && (
          <div className="demo-bar">
            Demo team: play with anything, it stays in your browser.
            <Link to="/demo?reset=1">Reset</Link> · <Link to="/start"><b>Make your own</b></Link>
          </div>
        )}
        {admin && !team.paid && (
          <button className="unlock-bar" onClick={() => setPaywall("full")}>
            Free trial · {FREE_RESULTS} results included · <b>Unlock the season for {PRICE}</b>
          </button>
        )}
        <nav className="tabs">
          {tabs.map(t => (
            <button key={t.id} className={t.id === current.id ? "on" : ""} onClick={() => ctx.go(t.id)}>{t.label}</button>
          ))}
        </nav>
      </header>

      <main className="t-main"><Tab {...ctx} /></main>

      <footer className="t-foot">
        <Link to="/" className="muted small">Made with ⚽ {BRAND}</Link>
        {!admin && <span className="muted small"> · Run a team? <Link to="/start">Set yours up</Link></span>}
      </footer>

      {paywall && <Paywall team={team} id={id} reason={paywall} onClose={() => setPaywall(null)} toast={toast} />}
      {welcome && <Welcome team={team} id={id} onClose={() => { setWelcome(false); navigate(`/t/${id}`, { replace: true }); }} toast={toast} />}
      {toastNode}
    </div>
  );
}

const REASONS = {
  full: "Unlock everything for the whole season.",
  results: `The free trial covers your first ${FREE_RESULTS} results. Unlock to keep the season going.`,
  subs: "The subs tracker is part of the full season.",
  fines: "The fines kitty is part of the full season.",
  season: "Starting a new season is part of the full version.",
};

function Paywall({ team, id, reason, onClose, toast }) {
  const [busy, setBusy] = useState(false);
  if (team.paid) return (
    <Modal title="Unlocked" onClose={onClose}>
      <p className="center big-emoji">🏆</p>
      <p className="center">{team.name} is unlocked. Thanks for backing {BRAND}.</p>
      <button className="btn primary block" onClick={onClose}>Back to the team</button>
    </Modal>
  );
  return (
    <Modal title={`Unlock ${team.name}`} onClose={onClose}>
      <p className="muted">{REASONS[reason] || REASONS.full}</p>
      <div className="paywall-price"><b>{PRICE}</b><span>one payment · no subscription</span></div>
      <ul className="ticks">
        <li>Unlimited results, stats and awards</li>
        <li>Subs and match fee tracker</li>
        <li>Fines kitty with quick-add fines</li>
        <li>New seasons, with old ones kept</li>
        <li>Share cards without our stamp</li>
        {CLOUD && <li>Co-managers</li>}
      </ul>
      <button className="btn primary block lg" disabled={busy} onClick={async () => {
        setBusy(true);
        try {
          await unlock(id);
          if (SIMULATED) toast("Unlocked (demo payment)");
        } catch { toast("Couldn't start the payment. Try again."); setBusy(false); }
      }}>{busy ? "One moment…" : `Pay ${PRICE} and unlock`}</button>
      {SIMULATED && <p className="muted small center">Demo mode: no card is charged. This marks the team as paid on this device.</p>}
      {!SIMULATED && <p className="muted small center">Secure checkout by Stripe. Apple Pay and Google Pay accepted.</p>}
    </Modal>
  );
}

function Welcome({ team, id, onClose, toast }) {
  const url = `${window.location.origin}/t/${id}`;
  return (
    <Modal title="You're set up 🎉" onClose={onClose}>
      <p>{team.name} is ready. Here's the link for the squad:</p>
      <div className="linkbox">
        <code>{url}</code>
        <button className="btn sm" onClick={async () => toast(await copyText(url) ? "Copied" : "Copy it from the box")}>Copy</button>
      </div>
      <a className="btn whatsapp block" target="_blank" rel="noreferrer"
        href={`https://wa.me/?text=${encodeURIComponent(`${team.name} has its own page now ⚽ Fixtures, results, stats and lineups: ${url}`)}`}>
        Send to the WhatsApp group
      </a>
      <ol className="next-steps">
        <li>Add photos in <b>Squad</b></li>
        <li>Add your next game in <b>Matches</b></li>
        <li>Pick the team in <b>Lineup</b> and share it</li>
      </ol>
      {!CLOUD && <p className="muted small">Running in local mode: this team is saved in this browser only. See the README to put it online.</p>}
      <button className="btn primary block" onClick={onClose}>Let's go</button>
    </Modal>
  );
}
