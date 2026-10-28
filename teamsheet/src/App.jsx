import { useEffect } from "react";
import Landing from "./Landing";
import Setup from "./Setup";
import Team from "./Team";
import { payingTeam } from "./billing";
import { seedDemo } from "./demo";
import { navigate, useRoute } from "./router";
import { DEMO_ID, localTeamExists } from "./store";

export default function App() {
  const { parts, query } = useRoute();
  const [section, id, tab] = parts;

  // /demo makes a fresh demo team (or keeps the one already being played
  // with) and opens it.
  useEffect(() => {
    if (section !== "demo") return;
    if (query.get("reset") === "1" || !localTeamExists(DEMO_ID)) seedDemo();
    navigate(`/t/${DEMO_ID}`, { replace: true });
  }, [section]); // eslint-disable-line react-hooks/exhaustive-deps

  // Back from Stripe checkout.
  useEffect(() => {
    if (section !== "paid") return;
    const team = payingTeam();
    navigate(team ? `/t/${team}?paid=1` : "/", { replace: true });
  }, [section]);

  if (section === "start") return <Setup />;
  if (section === "t" && id) return <Team key={id} id={id} tab={tab} query={query} />;
  if (section === "demo" || section === "paid") return null;
  return <Landing />;
}
