// ── Stripe webhook ───────────────────────────────────────────────────────────
// Stripe calls this when a £3 checkout completes. The Payment Link put the
// team id in client_reference_id; this checks the call really came from Stripe,
// then marks that team paid. It's the only thing that can: firestore.rules
// stops the app from writing `paid`, and the Admin SDK here skips the rules.
//
// Setup: see "Taking payments" in ../README.md.

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import Stripe from "stripe";

initializeApp();

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

export const stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET], region: "europe-west2" },
  async (req, res) => {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody, req.headers["stripe-signature"], STRIPE_WEBHOOK_SECRET.value());
    } catch (err) {
      res.status(400).send(`Bad signature: ${err.message}`);
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const teamId = session.client_reference_id;
      if (teamId && session.payment_status === "paid") {
        const ref = getFirestore().doc(`teams/${teamId}`);
        if ((await ref.get()).exists) {
          await ref.update({
            paid: true,
            paidAt: FieldValue.serverTimestamp(),
            stripeSession: session.id,
          });
        } else {
          // Paid for a team that isn't there (deleted, or a mistyped link).
          // Keep the record so it can be refunded or applied by hand.
          await getFirestore().doc(`unmatchedPayments/${session.id}`).set({
            teamId, email: session.customer_details?.email || null, at: FieldValue.serverTimestamp(),
          });
        }
      }
    }
    res.json({ received: true });
  });
