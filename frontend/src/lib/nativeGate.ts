// Decides what the mobile app does for each screen. Pure logic, no React: easy to test.
// On the website (not the app) nothing is blocked.

// Screens that may be opened in the mobile app without signing in.
export const PUBLIC_IN_APP: string[] = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/terms", "/privacy", "/cookies"];
// Sign-in / sign-up screens: a signed-in person is sent to their home instead of seeing them.
export const AUTH_PAGES: string[] = ["/login", "/signup"];

export type GateInput = { native: boolean; loading: boolean; loggedIn: boolean; pathname: string };
export type GateResult = "allow" | "wait" | "login" | "home";

function clean(pathname: string): string {
  const p = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "");
  return p === "" ? "/" : p;
}

export function isPublicInApp(pathname: string): boolean {
  const p = clean(pathname);
  return PUBLIC_IN_APP.some((x) => p === x || p.startsWith(x + "/"));
}

export function gateDecision(i: GateInput): GateResult {
  if (!i.native) return "allow";
  const pub = isPublicInApp(i.pathname);
  if (i.loading) return pub ? "allow" : "wait";
  if (!i.loggedIn) return pub ? "allow" : "login";
  if (AUTH_PAGES.includes(clean(i.pathname))) return "home";
  return "allow";
}
