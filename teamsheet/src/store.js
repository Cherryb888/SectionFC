// ── Storage ──────────────────────────────────────────────────────────────────
// One team is one document. Two backends behind the same functions:
//
//  - local: the browser's localStorage. Used when no Firebase config is set,
//    so the app can be tried with nothing set up. Teams made on this device
//    are this device's to edit.
//  - cloud: Firestore, loaded only when configured. Anyone with the link can
//    read a team; only its admins can change it (see firestore.rules), and
//    only the Stripe webhook can mark it paid.

import { useEffect, useState } from "react";

export const CLOUD = Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID);
const cloud = () => import("./cloud.js");

// The demo team always lives in the browser, even when the cloud is on, so
// visitors can play with it without touching anyone's real data.
export const DEMO_ID = "demo";
const remote = id => CLOUD && id !== DEMO_ID;

const LS_TEAMS = "teamsheet:teams";
const LS_MINE  = "teamsheet:mine";

const readLS = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const writeLS = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
};

// Same-tab listeners for local mode, so every screen showing a team updates
// when it's saved.
const listeners = new Map();
const emit = id => (listeners.get(id) || []).forEach(fn => fn(readLS(LS_TEAMS, {})[id] || null));

export const uid = () => Math.random().toString(36).slice(2, 10);

export const slugify = name =>
  (name || "team").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "team";

export function newTeam({ name, format, colors, crest, season, players }) {
  return {
    name: name.trim(),
    format,
    colors,
    crest: crest || null,
    season: { name: season?.name || "", league: season?.league || "" },
    players: players || [],
    matches: [],
    payments: {},
    lineup: null,
    archive: [],
    settings: { matchFee: "", payLink: "" },
    paid: false,
    createdAt: Date.now(),
  };
}

export async function createTeam(team) {
  const id = `${slugify(team.name)}-${uid().slice(0, 4)}`;
  if (CLOUD) {
    await (await cloud()).createTeam(id, team);
  } else {
    const all = readLS(LS_TEAMS, {});
    all[id] = { ...team, id };
    if (!writeLS(LS_TEAMS, all)) throw new Error("This browser is out of space. Try smaller photos.");
    writeLS(LS_MINE, [...new Set([...readLS(LS_MINE, []), id])]);
  }
  return id;
}

export async function saveTeam(id, patch) {
  if (remote(id)) return (await cloud()).saveTeam(id, patch);
  const all = readLS(LS_TEAMS, {});
  if (!all[id]) throw new Error("Team not found");
  all[id] = { ...all[id], ...patch };
  if (!writeLS(LS_TEAMS, all)) throw new Error("This browser is out of space. Try smaller photos.");
  emit(id);
}

export async function deleteTeam(id) {
  if (remote(id)) return (await cloud()).deleteTeam(id);
  const all = readLS(LS_TEAMS, {});
  delete all[id];
  writeLS(LS_TEAMS, all);
  writeLS(LS_MINE, readLS(LS_MINE, []).filter(x => x !== id));
  emit(id);
}

// Local mode only: put a team straight in, for the demo.
export function putLocalTeam(id, team, mine = true) {
  const all = readLS(LS_TEAMS, {});
  all[id] = { ...team, id };
  writeLS(LS_TEAMS, all);
  if (mine) writeLS(LS_MINE, [...new Set([...readLS(LS_MINE, []), id])]);
  emit(id);
}
export const localTeamExists = id => Boolean(readLS(LS_TEAMS, {})[id]);

// Teams this device can edit, for the "your teams" list on the landing page.
export function myTeams() {
  const all = readLS(LS_TEAMS, {});
  return readLS(LS_MINE, []).filter(id => id !== DEMO_ID).map(id => all[id]).filter(Boolean);
}

// Live team: { team, loading, error }. team is null when it doesn't exist.
export function useTeam(id) {
  const [state, setState] = useState({ team: null, loading: true, error: null });
  useEffect(() => {
    setState({ team: null, loading: true, error: null });
    if (remote(id)) {
      let unsub = () => {};
      let gone = false;
      cloud().then(c => {
        if (gone) return;
        unsub = c.watchTeam(id,
          team => setState({ team, loading: false, error: null }),
          error => setState({ team: null, loading: false, error }));
      });
      return () => { gone = true; unsub(); };
    }
    const fn = team => setState({ team, loading: false, error: null });
    listeners.set(id, [...(listeners.get(id) || []), fn]);
    fn(readLS(LS_TEAMS, {})[id] || null);
    return () => listeners.set(id, (listeners.get(id) || []).filter(x => x !== fn));
  }, [id]);
  return state;
}

// Whether this browser can edit the team.
export function useIsAdmin(id) {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!remote(id)) { setAdmin(id === DEMO_ID || readLS(LS_MINE, []).includes(id)); return; }
    let live = true;
    cloud().then(c => c.isAdmin(id)).then(a => live && setAdmin(a)).catch(() => {});
    return () => { live = false; };
  }, [id]);
  return [admin, setAdmin];
}

// Co-admin invite code, visible to admins. Anyone opening the team link with
// ?join=<code> becomes an admin too.
export async function adminCode(id) {
  if (!CLOUD) return null;
  return (await cloud()).adminCode(id);
}
export async function joinAsAdmin(id, code) {
  if (!CLOUD) return false;
  return (await cloud()).joinAsAdmin(id, code);
}
