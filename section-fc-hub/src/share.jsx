import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Capture a DOM node as PNG and hand it to the native share sheet (WhatsApp on
// mobile). On platforms without file-share support, fall back to downloading
// the image and opening WhatsApp Web with the caption pre-filled.

export async function shareNode(node, { caption = '', filename = 'section-fc.png', urlPath = '' } = {}) {
  if (!node) throw new Error('Nothing to share');
  const { toPng } = await import('html-to-image');

  // Wait for any <img> inside to fully decode so the capture isn't blank.
  const imgs = [...node.querySelectorAll('img')];
  await Promise.all(imgs.map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise(res => {
      img.addEventListener('load', res, { once: true });
      img.addEventListener('error', res, { once: true });
    });
  }));

  // Hide anything explicitly opted out (the share button itself, admin chrome).
  const hideEls = [...node.querySelectorAll('[data-share-hide]')];
  const prevVis = hideEls.map(el => el.style.visibility);
  hideEls.forEach(el => { el.style.visibility = 'hidden'; });

  let dataUrl;
  try {
    dataUrl = await toPng(node, {
      pixelRatio: 2,
      backgroundColor: '#0a0a0f',
      cacheBust: true,
      style: { transform: 'none' },
    });
  } finally {
    hideEls.forEach((el, i) => { el.style.visibility = prevVis[i] || ''; });
  }

  const url = `${window.location.origin}${urlPath || ''}`;
  const text = caption ? `${caption}\n${url}` : url;

  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], text, title: 'Section FC' });
      return { method: 'native' };
    } catch (err) {
      if (err && err.name === 'AbortError') return { method: 'cancelled' };
      // Fall through to manual download.
    }
  }

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(wa, '_blank', 'noopener');
  return { method: 'fallback' };
}

// Inline SVG share icon — looks the same as iOS / WhatsApp share glyph.
function ShareGlyph({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

// In-place share button. Captures the node returned by `getNode()` when clicked,
// or runs a custom `onShare` callback for off-screen card flows.
export function ShareButton({
  getNode,
  onShare,
  caption,
  filename = 'section-fc.png',
  urlPath = '',
  label = 'SHARE',
  variant = 'pill',     // 'pill' | 'icon' | 'ghost'
  style = {},
  size,
  onShared,
}) {
  const [busy, setBusy] = useState(false);

  const click = async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      if (typeof onShare === 'function') {
        await onShare();
      } else {
        const node = typeof getNode === 'function' ? getNode() : getNode;
        if (!node) return;
        await shareNode(node, { caption, filename, urlPath });
      }
      onShared?.();
    } catch (err) {
      console.error('share failed', err);
      alert("Couldn't generate share image — " + (err?.message || err));
    } finally {
      setBusy(false);
    }
  };

  const base = {
    background: '#e8ff0010',
    border: '1px solid #e8ff0044',
    color: '#e8ff00',
    fontFamily: "'Oswald',sans-serif",
    fontWeight: 700,
    letterSpacing: 2,
    cursor: busy ? 'wait' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'all .15s',
  };

  let composed;
  if (variant === 'icon') {
    const s = size || 28;
    composed = { ...base, width: s, height: s, padding: 0, fontSize: '.6rem' };
  } else if (variant === 'ghost') {
    composed = { ...base, background: 'transparent', border: '1px solid #ffffff22', color: '#ffffff77', padding: '6px 10px', fontSize: '.6rem' };
  } else {
    composed = { ...base, padding: '7px 14px', fontSize: '.65rem' };
  }

  return (
    <button
      type="button"
      data-share-hide="1"
      onClick={click}
      disabled={busy}
      title="Share to WhatsApp"
      style={{ ...composed, ...style }}
    >
      <ShareGlyph size={variant === 'icon' ? (size ? size * 0.5 : 14) : 12} />
      {variant !== 'icon' && (busy ? '…' : label)}
    </button>
  );
}

// Hook that lets a screen render a custom share-card off-screen on demand.
// Use when the on-screen markup is messy (admin controls, hover states) and
// you'd rather build a clean composition specifically for the screenshot.
//
//   const card = useShareCard();
//   <ShareButton getNode={() => card.ref.current} caption="…" onShared={card.reset} />
//   {card.portal}
//   card.render(<MyClean Card />)   // mounts the card off-screen
export function useShareCard() {
  const ref = useRef(null);
  const [content, setContent] = useState(null);

  const portal = content ? (
    <div
      ref={ref}
      data-share-card
      style={{
        position: 'fixed',
        left: -10000,
        top: 0,
        zIndex: -1,
        pointerEvents: 'none',
        background: '#0a0a0f',
      }}
    >
      {content}
    </div>
  ) : null;

  return {
    ref,
    portal,
    render: setContent,
    reset: () => setContent(null),
    content,
  };
}

// Convenience helper: render a card off-screen, wait for it to mount + paint,
// then share. Returns a Promise that resolves when sharing has finished.
export function useShareableCard() {
  const ref = useRef(null);
  const [state, setState] = useState(null); // { content, opts, resolver }

  // Mount card when state.content is set, capture once ready.
  useEffect(() => {
    if (!state) return;
    let cancelled = false;
    const run = async () => {
      // Two RAFs to ensure layout + paint.
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (cancelled) return;
      try {
        await shareNode(ref.current, state.opts);
        state.resolver?.();
      } catch (err) {
        console.error('shareable card failed', err);
        alert("Couldn't generate share image — " + (err?.message || err));
        state.resolver?.();
      } finally {
        if (!cancelled) setState(null);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [state]);

  const share = (jsx, opts) => new Promise(resolver => {
    setState({ content: jsx, opts, resolver });
  });

  const portal = state && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={ref}
          style={{
            position: 'fixed',
            left: -10000,
            top: 0,
            zIndex: -1,
            pointerEvents: 'none',
            background: '#0a0a0f',
          }}
        >
          {state.content}
        </div>,
        document.body
      )
    : null;

  return { share, portal, busy: !!state };
}
