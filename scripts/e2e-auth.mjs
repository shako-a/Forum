// Throwaway end-to-end auth check: drives the real login/signup server actions
// over HTTP via Next's no-JS progressive-enhancement form encoding, then follows
// the session cookie to confirm the user is logged in.
//
// Run: node scripts/e2e-auth.mjs   (dev server must be running on :3000)

const BASE = "http://localhost:3000";

function decode(s) {
  return s
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

// Extract all hidden inputs (the $ACTION_* fields React renders for no-JS forms).
function hiddenFields(html) {
  const fields = [];
  const re = /<input([^>]*\btype="hidden"[^>]*)>/g;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[1];
    const name = /\bname="([^"]*)"/.exec(tag)?.[1];
    const value = /\bvalue="([^"]*)"/.exec(tag)?.[1] ?? "";
    if (name) fields.push([decode(name), decode(value)]);
  }
  return fields;
}

function cookieFrom(res) {
  const all = res.headers.getSetCookie?.() ?? [];
  const session = all.find((c) => c.startsWith("session="));
  return session ? session.split(";")[0] : null;
}

async function submit(path, extra) {
  const page = await fetch(`${BASE}${path}`).then((r) => r.text());
  const fd = new FormData();
  for (const [name, value] of hiddenFields(page)) fd.append(name, value);
  for (const [name, value] of Object.entries(extra)) fd.set(name, value);

  const res = await fetch(`${BASE}${path}`, { method: "POST", body: fd, redirect: "manual" });
  return { status: res.status, location: res.headers.get("location"), cookie: cookieFrom(res) };
}

async function loggedInAs(cookie) {
  const html = await fetch(`${BASE}/en`, { headers: { cookie } }).then((r) => r.text());
  // Logged-in home shows the logout button and posts from locked categories.
  const hasLogout = html.includes("Log out");
  const seesLocked = html.includes("HVAC helper") || html.includes("dispatch companies");
  return { hasLogout, seesLocked };
}

const results = [];
function check(name, cond) {
  results.push([name, cond]);
  console.log(`${cond ? "✓" : "✗"} ${name}`);
}

// 1) SIGNUP a fresh user
const uniq = process.argv[2] || String(process.pid);
const email = `e2e_${uniq}@demo.local`;
const signup = await submit("/en/signup", {
  locale: "en",
  forumName: `e2e_${uniq}`,
  firstName: "Test",
  lastName: "User",
  email,
  password: "passw0rd",
  phone: "+1 555 0100",
  state: "Tbilisi",
  city: "Tbilisi",
});
check("signup returns redirect (3xx)", signup.status >= 300 && signup.status < 400);
check("signup sets session cookie", !!signup.cookie);
if (signup.cookie) {
  const s = await loggedInAs(signup.cookie);
  check("after signup: home shows logged-in (Log out)", s.hasLogout);
}

// 2) LOGIN as the seeded admin
const login = await submit("/en/login", { locale: "en", email: "admin@forum.local", password: "admin1234" });
check("login returns redirect (3xx)", login.status >= 300 && login.status < 400);
check("login sets session cookie", !!login.cookie);
if (login.cookie) {
  const s = await loggedInAs(login.cookie);
  check("after login: home shows logged-in (Log out)", s.hasLogout);
  check("after login: locked-category posts now visible", s.seesLocked);
}

// 3) LOGIN with wrong password is rejected (no cookie, no redirect)
const bad = await submit("/en/login", { locale: "en", email: "admin@forum.local", password: "wrong" });
check("bad password: no session cookie issued", !bad.cookie);

const failed = results.filter(([, c]) => !c);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
