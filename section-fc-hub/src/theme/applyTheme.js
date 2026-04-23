function hexToRgb(hex) {
  if (!hex || hex[0] !== '#') return null;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mix(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const t = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const R = Math.round((t - rgb.r) * p + rgb.r);
  const G = Math.round((t - rgb.g) * p + rgb.g);
  const B = Math.round((t - rgb.b) * p + rgb.b);
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

export function applyTheme(colors = {}) {
  const primary = colors.primary || '#e8ff00';
  const accent = colors.accent || '#ff7755';
  const bg = colors.bg || '#0a0a0f';
  const root = document.documentElement;
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-soft', mix(primary, -0.3));
  root.style.setProperty('--primary-dim', primary + '22');
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--bg', bg);
  root.style.setProperty('--bg-raised', mix(bg, 0.05));
  root.style.setProperty('--bg-card', mix(bg, 0.08));
  root.style.setProperty('--border', mix(bg, 0.18));
  root.style.setProperty('--text', '#fff');
  root.style.setProperty('--muted', '#ffffffaa');
  root.style.setProperty('--muted-soft', '#ffffff55');
  root.style.setProperty('--win', '#44dd88');
  root.style.setProperty('--loss', '#ff4444');
  root.style.setProperty('--draw', '#888');
}

export function resetTheme() {
  applyTheme({});
}
