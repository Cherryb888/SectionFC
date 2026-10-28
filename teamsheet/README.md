# Teamsheet

The Section FC hub turned into a product any team can buy. A manager picks
5 to 11-a-side, adds a name, colours, crest and squad, and gets one link for
the whole team: fixtures, results, lineups on a pitch, stats that add
themselves up, awards, subs collection, a fines kitty, and share images for
the group chat.

It's separate from `section-fc-hub/`, which carries on as it is. "Teamsheet"
is a working name: it lives in `src/brand.js`.

## Try it

```
cd teamsheet
npm install
npm run dev
```

With no `.env` it runs in **local mode**: teams are saved in the browser and
the £3 button simulates the payment, so every screen can be tried with
nothing set up. `/demo` opens a made-up 7-a-side team half way through a
season.

## What's free and what's paid

| Free trial | £3 once, per team |
|---|---|
| Set-up, any format | Everything in the trial |
| Squad with photos | Unlimited results and stats |
| Lineup builder and sharing | Subs and match fee tracker |
| First 3 results and stats | Fines kitty |
| | New seasons, old ones kept |
| Shareable team link | Share cards without the "Made with" stamp |
| | Co-managers |

The limits live in `src/billing.js` (`FREE_RESULTS`, `PRICE`).

## The fines kitty

The Fines tab is the bit every five-a-side team already runs on WhatsApp.
The manager taps **Dish out a fine**, picks a reason from the quick-add
buttons (Late £2, No-show £5, Red card £5 and so on, all editable under
**Presets**) or types their own, picks one player or several, and adds a note.
The modal stays open so a whole night's fines go in one after another.

Everyone sees each fine with the manager's note, a fines table of the worst
offenders, what's in the kitty and what's still owed. Players pay a fine, or
everything they owe, with one tap on the manager's Monzo or PayPal link, and
any fine can go into the group chat as a "FINED" card.

## How it's built

- **React + Vite**, same as the Section FC hub. No router library: `src/router.jsx`.
- **One document per team**: squad, matches, payments, lineup and past seasons.
  Stats are worked out from the matches in `src/stats.js`, never stored twice.
- **Photos** are cropped and shrunk to 200px in the browser (`resizeImage` in
  `src/ui.jsx`), so a squad's worth fits in the team document.
- **Formats** (`src/formats.js`): each format lists its formations as strings
  like `"2-3-1"`, and pitch positions are worked out from them.
- **Storage** (`src/store.js`): localStorage, or Firestore when configured.
  Firebase is only downloaded when it's switched on.

### Security

Unlike the Section FC hub, there's no PIN in the code and the database isn't
open. Every visitor gets a silent anonymous Firebase sign-in. Whoever creates
a team is its admin, and can invite co-managers with a secret link. The rules
in `firestore.rules`:

- anyone can read a team (that's what sharing the link is for)
- only that team's admins can change it
- **nobody in the app can set `paid`**: only the Stripe webhook can

## Going live

1. **Firebase**: make a new project (don't reuse `section-fc`). Turn on
   Firestore and **Authentication → Anonymous**. Move it to the Blaze plan,
   which Cloud Functions need. It's pay-as-you-go with a free allowance; set a
   budget alert of £5.
2. **Config**: copy `.env.example` to `.env` and fill in the web app config
   from Project settings, and run `firebase use --add` to point the CLI at
   the new project.
3. **Stripe**: make a product "Teamsheet, unlock a team" at £3, then a
   **Payment Link** for it. Under "After payment", redirect customers to
   `https://<your domain>/paid`, which takes them back to their team. Put the
   link in `VITE_STRIPE_PAYMENT_LINK`.
4. **Webhook**:
   ```
   cd functions && npm install && cd ..
   firebase functions:secrets:set STRIPE_SECRET_KEY
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   npm run build && firebase deploy
   ```
   In Stripe → Developers → Webhooks, add `https://<your domain>/api/stripe-webhook`
   for the `checkout.session.completed` event, and use its signing secret as
   `STRIPE_WEBHOOK_SECRET`.
5. **Test** with Stripe's test mode and card `4242 4242 4242 4242` before
   switching to live keys.
6. **Domain**: buy it and connect it in Firebase Hosting.

## The money

Per sale at £3, paid by a UK card through Stripe (1.5% + 20p):

| | |
|---|---|
| Price | £3.00 |
| Stripe fee | ~£0.25 |
| **You keep** | **~£2.75** |

Running costs are small because teams cost almost nothing to serve: one
document per team, read when someone opens the link.

| Teams | Revenue (once) | Hosting + database, per month |
|---|---|---|
| 100 | ~£275 | £0 (inside the free allowance) |
| 1,000 | ~£2,750 | roughly £0–£10, mostly photo downloads |
| 10,000 | ~£27,500 | roughly £20–£80 |

Fixed costs: a domain (~£10–£15 a year). Selling online in the UK also means
registering with the ICO as a data controller (about £50 a year at the lowest
tier; check the current fee) and having a privacy policy, since the app
stores names and photos of players.

Below the £90k VAT threshold there's no VAT to charge. Selling through Apple
or Google's app stores would cost 15–30% of every sale; as a website that
installs to the home screen it costs nothing.

### Worth thinking about

- **A one-off £3 only earns when new teams sign up.** Seasons restart every
  few months anyway, so "£3 per team per season" would bring the same teams
  back to pay again, and still feels like nothing. It's one constant to
  change.
- **The stamp is the marketing.** Every result card a free team posts in a
  group chat says "Made with Teamsheet", and the team page footer links to the
  set-up. Leagues are the next step: one league organiser telling every team
  in a division about it is worth more than any ad.

## Not built yet

- Co-managers editing at the same moment can overwrite each other's change
  (last save wins). Fine for one or two managers.
- Photos sit in the team document. Past ~40 players with photos, move them to
  Firebase Storage.
- League tables with every team's results, like the Section FC hub has.
- Email receipts and a way to get a team back if the browser that made it is
  lost (co-manager links cover this for now).
