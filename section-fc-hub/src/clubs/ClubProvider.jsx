import React, { createContext, useContext, useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthProvider';
import { applyTheme } from '../theme/applyTheme';

const ClubCtx = createContext(null);

export function ClubProvider({ children }) {
  const { slug } = useParams();
  const { user } = useAuth();
  const [club, setClub] = useState(null);
  const [players, setPlayers] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    setNotFound(false);
    if (!slug) return;
    const unsub = onSnapshot(doc(db, 'clubs', slug), (snap) => {
      if (!snap.exists()) {
        setNotFound(true);
        setReady(true);
        return;
      }
      const data = { id: snap.id, ...snap.data() };
      setClub(data);
      applyTheme(data.colors || {});
      setReady(true);
    }, () => {
      setNotFound(true);
      setReady(true);
    });
    return unsub;
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const q = query(collection(db, 'clubs', slug, 'players'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [slug]);

  if (!ready) return <div className="center-screen">Loading club…</div>;
  if (notFound) return <Navigate to="/" replace />;

  const isAdmin = !!user && Array.isArray(club?.admins) && club.admins.includes(user.uid);
  const isOwner = !!user && club?.ownerUid === user.uid;

  return (
    <ClubCtx.Provider value={{ club, clubId: club?.id, players, isAdmin, isOwner }}>
      {children}
    </ClubCtx.Provider>
  );
}

export function useClub() {
  const ctx = useContext(ClubCtx);
  if (!ctx) throw new Error('useClub must be used inside ClubProvider');
  return ctx;
}
