// ── Firestore backend ────────────────────────────────────────────────────────
// Loaded by store.js only when a Firebase config is set. Every visitor gets a
// silent anonymous sign-in; the browser that creates a team is its first
// admin, and others join with the team's invite code. Layout:
//
//   teams/{id}                  the team, readable by anyone with the link
//   teams/{id}/admins/{uid}     who can edit it
//   teams/{id}/secrets/admin    { code }, the invite code, admins only

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore, doc, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot,
} from "firebase/firestore";

const env = import.meta.env;
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

const user = new Promise((resolve, reject) => {
  const stop = onAuthStateChanged(auth, u => {
    if (u) { stop(); resolve(u); }
    else signInAnonymously(auth).catch(reject);
  });
});

const code = () => Array.from(crypto.getRandomValues(new Uint8Array(9)), b => (b % 36).toString(36)).join("");

export async function createTeam(id, team) {
  const u = await user;
  // One at a time: each step's rule checks the one before it.
  await setDoc(doc(db, "teams", id), { ...team, id, ownerUid: u.uid, paid: false });
  await setDoc(doc(db, "teams", id, "admins", u.uid), { since: Date.now() });
  await setDoc(doc(db, "teams", id, "secrets", "admin"), { code: code() });
}

export async function saveTeam(id, patch) {
  await user;
  // Never send paid: only the payment webhook may change it.
  const { paid, ownerUid, ...rest } = patch;
  await updateDoc(doc(db, "teams", id), rest);
}

export async function deleteTeam(id) {
  await user;
  await deleteDoc(doc(db, "teams", id));
}

export function watchTeam(id, onTeam, onError) {
  let unsub = () => {}, gone = false;
  user.then(() => {
    if (gone) return;
    unsub = onSnapshot(doc(db, "teams", id), s => onTeam(s.exists() ? s.data() : null), onError);
  }, onError);
  return () => { gone = true; unsub(); };
}

export async function isAdmin(id) {
  const u = await user;
  return (await getDoc(doc(db, "teams", id, "admins", u.uid))).exists();
}

export async function adminCode(id) {
  await user;
  return (await getDoc(doc(db, "teams", id, "secrets", "admin"))).data()?.code || null;
}

export async function joinAsAdmin(id, joinCode) {
  const u = await user;
  try {
    await setDoc(doc(db, "teams", id, "admins", u.uid), { since: Date.now(), code: joinCode });
    return true;
  } catch {
    return false;
  }
}
