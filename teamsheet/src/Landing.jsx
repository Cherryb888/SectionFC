import { useState } from "react";
import { BRAND } from "./brand";
import { PRICE, FREE_RESULTS } from "./billing";
import { FORMATS, FORMAT_SIZES, formationSlots, defaultFormation } from "./formats";
import { Link } from "./router";
import { myTeams } from "./store";
import { Crest } from "./ui";

const FEATURES = [
  { icon: "🧩", title: "Set up in two minutes", body: "Pick 5 to 11-a-side, your colours and crest, paste your squad from the group chat. Done." },
  { icon: "📊", title: "Stats that add themselves", body: "Enter the score and who scored. Goals, assists, appearances, clean sheets and MOTM all add up for you." },
  { icon: "🟢", title: "Lineups on a real pitch", body: "Formations for every format. Tap a shirt, tap a player, share the team sheet before kick-off." },
  { icon: "💷", title: "Subs, sorted", body: "Set the match fee, see who owes what, and send players a one-tap Monzo or PayPal link." },
  { icon: "🧾", title: "The fines kitty", body: "Late again? Forgot his boots? Fine him in two taps with a note from the gaffer. Everyone sees why, and he pays in one tap." },
  { icon: "📲", title: "Built for the group chat", body: "Results, lineups and top scorers turn into images made for WhatsApp. One link for the whole squad." },
  { icon: "🏆", title: "Every season kept", body: "Close a season, start the next. Your records, top scorers and trophies stay." },
];

const FAQ = [
  ["Is it really one payment?", `Yes. ${PRICE} once per team, no subscription, nothing to cancel. You can try it free first: set-up, squad, lineups and your first ${FREE_RESULTS} results cost nothing.`],
  ["Do my players need to sign up?", "No. They open the team link and see everything. Only you, and anyone you invite as a co-manager, can change things."],
  ["Is it an app I download?", "It runs in the browser, so it works on any phone. Tap 'Add to Home Screen' and it sits there like an app."],
  ["We play 7s in winter and 11s in summer.", "Change the format any time in Settings and the lineup builder follows."],
  ["What about the money we collect for pitch hire?", "Payments for subs and fines go straight from your players to you, through your own Monzo, PayPal or bank link. We never touch it."],
];

function MiniPitch({ size }) {
  const slots = formationSlots(defaultFormation(size));
  return (
    <div className="mini-pitch">
      <div className="mp-lines" />
      {slots.map((s, i) => (
        <span key={i} className={`mp-dot ${s.pos === "GK" ? "gk" : ""}`} style={{ left: `${s.x}%`, top: `${s.y}%` }} />
      ))}
    </div>
  );
}

function PhoneMock() {
  return (
    <div className="phone">
      <div className="phone-notch" />
      <div className="phone-screen">
        <div className="pm-head">
          <span className="crest crest-gen" style={{ width: 34, height: 34, fontSize: 13, background: "#e8ff00", color: "#111" }}>DR</span>
          <div><b>Dynamo Rovers</b><small>Sunday League · 7-a-side</small></div>
        </div>
        <div className="pm-score">
          <small>LAST RESULT · W</small>
          <div><span>DYN</span><b>4 – 2</b><span>ATH</span></div>
          <em>⚽ Okafor 2 · Reid · Patel</em>
        </div>
        <div className="pm-row">
          <div><b>7</b><small>Played</small></div>
          <div><b>5</b><small>Won</small></div>
          <div><b>16</b><small>Pts</small></div>
        </div>
        <div className="pm-list">
          <small>GOLDEN BOOT</small>
          {[["Okafor", 9], ["Reid", 6], ["Patel", 4]].map(([n, g], i) => (
            <div key={n}><span>{i + 1}</span>{n}<b>{g}</b></div>
          ))}
        </div>
        <div className="pm-form">{["W", "W", "D", "W", "L"].map((r, i) => <span key={i} className={`f-${r}`}>{r}</span>)}</div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [size, setSize] = useState(7);
  const mine = myTeams();
  return (
    <div className="landing">
      <nav className="l-nav">
        <span className="logo">⚽ {BRAND}</span>
        <div>
          <Link to="/demo" className="link">See a demo</Link>
          <Link to="/start" className="btn primary sm">Start free</Link>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-copy">
          <span className="pill">5-a-side to 11-a-side</span>
          <h1>Your team's season.<br /><em>One link.</em></h1>
          <p className="lead">
            Fixtures, results, lineups, stats, subs and player photos for your five-a-side, Sunday league
            or work team. Set it up once, share the link, and the whole squad follows the season.
          </p>
          <div className="hero-cta">
            <Link to="/start" className="btn primary lg">Set up your team, free</Link>
            <Link to="/demo" className="btn ghost lg">Try the demo team</Link>
          </div>
          <p className="muted small">No sign-up for players · {PRICE} once to unlock the full season · No subscription</p>
        </div>
        <PhoneMock />
      </header>

      {mine.length > 0 && (
        <section className="l-section mine">
          <h3>Your teams on this device</h3>
          <div className="mine-list">
            {mine.map(t => (
              <Link key={t.id} to={`/t/${t.id}`} className="mine-card">
                <Crest team={t} size={36} />
                <span><b>{t.name}</b><small>{FORMATS[t.format]?.label}</small></span>
                <span className="chev">›</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="l-section formats">
        <h2>Whatever you play</h2>
        <p className="muted">Pick your format and the lineup builder, positions and squad size follow.</p>
        <div className="format-strip">
          {FORMAT_SIZES.map(n => (
            <button key={n} className={`fmt ${n === size ? "on" : ""}`} onClick={() => setSize(n)}>
              <b>{n}</b><small>a-side</small>
            </button>
          ))}
        </div>
        <div className="format-demo">
          <MiniPitch size={size} />
          <div>
            <h3>{FORMATS[size].label}</h3>
            <p className="muted">Formations: {FORMATS[size].formations.join(" · ")}</p>
            <p className="muted">Typical squad: {FORMATS[size].squadHint}</p>
          </div>
        </div>
      </section>

      <section className="l-section">
        <h2>Everything a team needs. Nothing it doesn't.</h2>
        <div className="features">
          {FEATURES.map(f => (
            <div key={f.title} className="feature">
              <span className="f-icon">{f.icon}</span>
              <h4>{f.title}</h4>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="l-section steps">
        <h2>Kick-off in three steps</h2>
        <ol>
          <li><b>Set up</b><span>Format, name, colours, crest and squad. Two minutes.</span></li>
          <li><b>Share the link</b><span>Drop it in the group chat. Players see everything, no app store, no log-in.</span></li>
          <li><b>Play</b><span>After each game, add the score and who scored. The table, stats and awards update for everyone.</span></li>
        </ol>
      </section>

      <section className="l-section pricing" id="pricing">
        <h2>One price. One payment.</h2>
        <div className="price-grid">
          <div className="price-card">
            <h4>Try it</h4>
            <div className="price">£0</div>
            <ul>
              <li>Full set-up, any format</li>
              <li>Squad with photos</li>
              <li>Lineup builder</li>
              <li>First {FREE_RESULTS} results and stats</li>
              <li>Shareable team link</li>
            </ul>
            <Link to="/start" className="btn ghost block">Start free</Link>
          </div>
          <div className="price-card best">
            <span className="pill">Whole season</span>
            <h4>Unlock your team</h4>
            <div className="price">{PRICE}<small> once</small></div>
            <ul>
              <li>Everything in Try it</li>
              <li>Unlimited results and stats</li>
              <li>Subs and match fee tracker</li>
              <li>Fines kitty</li>
              <li>New seasons, with past seasons kept</li>
              <li>Share cards without our stamp</li>
              <li>Co-managers</li>
            </ul>
            <Link to="/start" className="btn primary block">Set up and unlock</Link>
            <p className="muted small center">Less than a bottle of water at the pitch.</p>
          </div>
        </div>
      </section>

      <section className="l-section faq">
        <h2>Questions</h2>
        {FAQ.map(([q, a]) => (
          <details key={q}><summary>{q}</summary><p>{a}</p></details>
        ))}
      </section>

      <section className="l-section final-cta">
        <h2>Your season starts at kick-off.</h2>
        <Link to="/start" className="btn primary lg">Set up your team</Link>
      </section>

      <footer className="l-foot">
        <span>⚽ {BRAND}</span>
        <span className="muted small">Made for the teams who play on Monday nights.</span>
      </footer>
    </div>
  );
}
