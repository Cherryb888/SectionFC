// ── Billing ──────────────────────────────────────────────────────────────────
// One price, paid once per team: £3 unlocks the whole thing for good.
//
// Free, so a manager can see it working before paying: set-up, the squad, the
// lineup builder and the first FREE_RESULTS results. Unlocking adds every
// result after that, the subs tracker, the fines kitty, new seasons, and share cards without
// the "Made with Teamsheet" stamp.
//
// Payment is a Stripe Payment Link, so there's no card form to build or
// secure. The link carries the team id as client_reference_id; the webhook in
// functions/ marks that team paid when Stripe confirms the charge. With no
// local mode the button simulates the payment instead.

import { CLOUD, saveTeam } from "./store";

export const PRICE = "£3";
export const FREE_RESULTS = 3;
export const PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK || "";
// Local mode has no server to confirm a payment, so it pretends.
export const SIMULATED = !CLOUD;

export const canAddResult = (team, resultCount) => team.paid || resultCount < FREE_RESULTS;

export function checkoutUrl(teamId) {
  if (!PAYMENT_LINK) throw new Error("Payments aren't set up: VITE_STRIPE_PAYMENT_LINK is empty");
  const u = new URL(PAYMENT_LINK);
  u.searchParams.set("client_reference_id", teamId);
  return u.toString();
}

export async function unlock(teamId) {
  if (SIMULATED) {
    await saveTeam(teamId, { paid: true, paidAt: Date.now() });
    return;
  }
  // Stripe sends the buyer back to /paid, which can't be told the team, so
  // remember it here.
  try { localStorage.setItem(PAYING_KEY, teamId); } catch { /* back at the home page instead */ }
  window.location.href = checkoutUrl(teamId);
}

const PAYING_KEY = "teamsheet:paying";
export function payingTeam() {
  try { return localStorage.getItem(PAYING_KEY); } catch { return null; }
}
