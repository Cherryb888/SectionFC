import { prettyDate, results, subsOwed, money } from "../stats";
import { Avatar, Empty, copyText } from "../ui";

// A payment link with the amount filled in, where the service supports it.
// Monzo and PayPal both take it on the end of the link.
export function payUrl(link, amount) {
  if (!link) return "";
  let url = link.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\/+$/, "");
  if (!amount) return url;
  if (/monzo\.me\//i.test(url)) return `${url}/${amount}`;
  if (/paypal\.me\//i.test(url)) return `${url}/${amount}GBP`;
  return url;
}

export default function Subs({ team, admin, save, toast, requirePaid, go }) {
  const fee = Number(team.settings?.matchFee) || 0;
  const link = team.settings?.payLink;
  const owed = subsOwed(team);
  const games = [...results(team)].reverse();
  const debtors = team.players.filter(p => owed[p.id]?.amount > 0).sort((a, b) => owed[b.id].amount - owed[a.id].amount);
  const total = debtors.reduce((n, p) => n + owed[p.id].amount, 0);

  if (!team.paid) return (
    <Empty icon="💷" title="Collect subs without chasing">
      <p className="muted">Set a match fee and see who owes what after every game. Players get a one-tap Monzo or PayPal link with the amount filled in.</p>
      {admin
        ? <button className="btn primary" onClick={() => requirePaid("subs")}>Unlock subs tracking</button>
        : <p className="muted small">Your manager can switch this on.</p>}
    </Empty>
  );

  if (!fee) return (
    <Empty icon="💷" title="No match fee set">
      {admin
        ? <><p className="muted">Set how much each player pays per game, and your payment link.</p><button className="btn primary" onClick={() => go("settings")}>Set match fee</button></>
        : <p className="muted">Your manager hasn't set a match fee.</p>}
    </Empty>
  );

  const togglePaid = (mid, pid) => {
    const forMatch = { ...(team.payments?.[mid] || {}) };
    if (forMatch[pid]) delete forMatch[pid]; else forMatch[pid] = true;
    save({ payments: { ...team.payments, [mid]: forMatch } });
  };
  const settleAll = pid => {
    const payments = { ...team.payments };
    games.forEach(m => { if (m.played?.includes(pid)) payments[m.id] = { ...payments[m.id], [pid]: true }; });
    save({ payments }, "Marked as paid up");
  };
  const reminder = () => {
    const lines = debtors.map(p => `• ${p.name}: ${money(owed[p.id].amount)}`);
    return `💷 Subs owed (${money(fee)} a game)\n${lines.join("\n")}${link ? `\n\nPay here: ${payUrl(link)}` : ""}`;
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="card-head"><h3>Owed</h3><span className="big-num">{money(total)}</span></div>
        <p className="muted small">{money(fee)} per game{link ? "" : " · add a payment link in Settings so players can pay in one tap"}</p>
        {debtors.length === 0 && <p>Everyone's paid up. 🙌</p>}
        {debtors.map(p => (
          <div key={p.id} className="owe-row">
            <Avatar player={p} size={34} />
            <span className="grow"><b>{p.name}</b><small className="muted">{owed[p.id].games} game{owed[p.id].games > 1 ? "s" : ""}</small></span>
            <b>{money(owed[p.id].amount)}</b>
            {link && <a className="btn sm primary" href={payUrl(link, owed[p.id].amount)} target="_blank" rel="noreferrer">Pay</a>}
            {admin && <button className="btn sm ghost" onClick={() => settleAll(p.id)}>Paid</button>}
          </div>
        ))}
        {admin && debtors.length > 0 && (
          <div className="row gap">
            <a className="btn whatsapp grow" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(reminder())}`}>Send reminder</a>
            <button className="btn ghost" onClick={async () => toast(await copyText(reminder()) ? "Reminder copied" : "Couldn't copy")}>Copy</button>
          </div>
        )}
      </section>

      {admin && games.length > 0 && <>
        <h3 className="section-title">By game</h3>
        {games.map(m => (
          <section key={m.id} className="card">
            <div className="card-head"><h4>{prettyDate(m.date)} · {m.opponent}</h4><small className="muted">{m.gf}–{m.ga}</small></div>
            {!(m.played || []).length && <p className="muted small">No players marked as playing.</p>}
            <div className="chips selectable">
              {team.players.filter(p => m.played?.includes(p.id)).map(p => {
                const paid = team.payments?.[m.id]?.[p.id];
                return (
                  <button key={p.id} className={`chip ${paid ? "on" : "owe"}`} onClick={() => togglePaid(m.id, p.id)}>
                    {paid ? "✓" : "£"} {p.name}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </>}
    </div>
  );
}
