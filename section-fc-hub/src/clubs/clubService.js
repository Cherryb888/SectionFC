import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection,
  addDoc, serverTimestamp, arrayUnion, query, where, getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';

export function slugify(raw) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
}

export async function isSlugAvailable(slug) {
  const snap = await getDoc(doc(db, 'clubs', slug));
  return !snap.exists();
}

export async function createClub({ owner, name, slug, tagline, primary, accent, crestUrl, squadSize, league }) {
  const clubId = slug;
  await setDoc(doc(db, 'clubs', clubId), {
    name,
    slug,
    tagline: tagline || '',
    colors: { primary: primary || '#e8ff00', accent: accent || '#ff7755' },
    crestUrl: crestUrl || '',
    ownerUid: owner.uid,
    ownerEmail: owner.email,
    admins: [owner.uid],
    squadSize: squadSize || 5,
    league: league || '',
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', owner.uid), {
    clubs: arrayUnion(clubId),
  });
  return clubId;
}

export async function deleteClub(clubId) {
  await deleteDoc(doc(db, 'clubs', clubId));
}

export function clubDoc(clubId) {
  return doc(db, 'clubs', clubId);
}

export function scoped(clubId, ...segs) {
  return [db, 'clubs', clubId, ...segs];
}

export function scopedCol(clubId, name) {
  return collection(db, 'clubs', clubId, name);
}

export function scopedDoc(clubId, colName, docId) {
  return doc(db, 'clubs', clubId, colName, docId);
}

export async function listClubsForUser(uid) {
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) return [];
  const ids = userSnap.data().clubs || [];
  const out = [];
  for (const id of ids) {
    const s = await getDoc(doc(db, 'clubs', id));
    if (s.exists()) out.push({ id, ...s.data() });
  }
  return out;
}

export async function addPlayer(clubId, player) {
  return addDoc(collection(db, 'clubs', clubId, 'players'), {
    ...player,
    createdAt: serverTimestamp(),
  });
}

export async function updatePlayer(clubId, playerId, patch) {
  return updateDoc(doc(db, 'clubs', clubId, 'players', playerId), patch);
}

export async function removePlayer(clubId, playerId) {
  return deleteDoc(doc(db, 'clubs', clubId, 'players', playerId));
}
