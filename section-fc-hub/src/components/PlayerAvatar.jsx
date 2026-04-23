import React from 'react';

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase() || '?';
}

export default function PlayerAvatar({ name, photoUrl, size }) {
  const cls = size === 'lg' ? 'avatar avatar-lg' : size === 'sm' ? 'avatar avatar-sm' : 'avatar';
  return (
    <span className={cls} aria-label={name}>
      {photoUrl ? <img src={photoUrl} alt={name} /> : initials(name)}
    </span>
  );
}
