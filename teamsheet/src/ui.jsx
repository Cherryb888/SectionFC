import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BRAND, DOMAIN } from "./brand";

// ── Images ───────────────────────────────────────────────────────────────────
// Photos are shrunk in the browser before saving, so a whole squad's worth
// fits in the team document and loads fast on a phone at the pitch.
export function resizeImage(file, size = 200, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That doesn't look like an image"));
      img.onload = () => {
        // Square crop from the middle, which suits faces and crests.
        const s = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        canvas.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve(canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function ImagePicker({ value, onChange, label = "Add photo", round = true, size = 200 }) {
  const input = useRef();
  const [err, setErr] = useState("");
  return (
    <div className="imgpick">
      <button type="button" className={`imgpick-btn ${round ? "round" : ""}`} onClick={() => input.current.click()}>
        {value ? <img src={value} alt="" /> : <span>＋<small>{label}</small></span>}
      </button>
      {value && <button type="button" className="link small" onClick={() => onChange(null)}>Remove</button>}
      <input ref={input} type="file" accept="image/*" hidden onChange={async e => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        try { setErr(""); onChange(await resizeImage(f, size)); } catch (x) { setErr(x.message); }
      }} />
      {err && <div className="err">{err}</div>}
    </div>
  );
}

// ── Bits ─────────────────────────────────────────────────────────────────────
export const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();

export function Avatar({ player, size = 40 }) {
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (player?.photo) return <img className="avatar" src={player.photo} alt="" style={style} />;
  return <span className="avatar" style={style}>{player ? initials(player.name) : "?"}</span>;
}

export function Crest({ team, size = 48 }) {
  const style = { width: size, height: size, fontSize: size * 0.36 };
  if (team.crest) return <img className="crest" src={team.crest} alt="" style={style} />;
  return <span className="crest crest-gen" style={style}>{initials(team.name)}</span>;
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const k = e => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);
  return createPortal(
    <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body);
}

export function Stepper({ value = 0, onChange, min = 0, max = 99 }) {
  return (
    <span className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
      <b>{value}</b>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))}>＋</button>
    </span>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Empty({ icon, title, children }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h4>{title}</h4>
      {children}
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2400);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? createPortal(<div className="toast">{msg}</div>, document.body) : null;
  return [setMsg, node];
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

// ── Sharing ──────────────────────────────────────────────────────────────────
// Turns a card into a PNG and hands it to the phone's share sheet, which is
// how it gets into the team WhatsApp. Desktop browsers get a download.
async function nodeToFile(node, filename) {
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
  const blob = await (await fetch(dataUrl)).blob();
  return { dataUrl, file: new File([blob], filename, { type: "image/png" }) };
}

export function ShareModal({ title, caption, filename = "teamsheet.png", onClose, children }) {
  const card = useRef();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const go = async () => {
    setBusy(true); setNote("");
    try {
      const { dataUrl, file } = await nodeToFile(card.current, filename);
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], text: caption }); return onClose(); }
        catch (e) { if (e?.name === "AbortError") return; }
      }
      const a = document.createElement("a");
      a.href = dataUrl; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      if (caption) await copyText(caption);
      setNote(caption ? "Image saved and caption copied. Paste them into the group chat." : "Image saved.");
    } catch {
      setNote("Couldn't make the image on this browser. A screenshot works too.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={title} onClose={onClose}>
      <div className="share-stage"><div ref={card}>{children}</div></div>
      <button className="btn primary block" onClick={go} disabled={busy}>{busy ? "Making image…" : "Share image"}</button>
      {note && <p className="muted center small">{note}</p>}
    </Modal>
  );
}

// "Made with Teamsheet" on share cards for unpaid teams. It's the free
// advertising: every result posted in a group chat is a shop window.
export const Stamp = ({ show }) => show ? <div className="stamp">Made with <b>{BRAND}</b> · {DOMAIN}</div> : null;
