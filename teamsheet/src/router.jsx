// A tiny router: the path picks the screen, and navigate() changes it
// without a page load. Firebase Hosting sends every path to index.html.
import { useEffect, useState } from "react";

export function navigate(to, { replace = false } = {}) {
  if (to === window.location.pathname + window.location.search) return;
  window.history[replace ? "replaceState" : "pushState"]({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
}

export function useRoute() {
  const [loc, setLoc] = useState(() => ({ path: window.location.pathname, search: window.location.search }));
  useEffect(() => {
    const on = () => setLoc({ path: window.location.pathname, search: window.location.search });
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  return { ...loc, parts: loc.path.split("/").filter(Boolean), query: new URLSearchParams(loc.search) };
}

export function Link({ to, children, ...rest }) {
  return <a href={to} onClick={e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault(); navigate(to);
  }} {...rest}>{children}</a>;
}
