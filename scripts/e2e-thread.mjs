// Throwaway end-to-end check for replies + voting render.
// Logs in as admin, posts a top-level reply and a nested reply through the real
// createReply form action, and confirms the post page renders the vote control.
//
// Run: node scripts/e2e-thread.mjs   (dev server must be running on :3000)

const BASE = "http://localhost:3000";
const SLUG = "georgian-food-spots-by-city"; // unlocked Discussions demo post

function decode(s) {
  return s
    .replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}
function hiddenFields(html) {
  const fields = [];
  const re = /<input([^>]*\btype="hidden"[^>]*)>/g;
  let m;
  while ((m = re.exec(html))) {
    const t = m[1];
    const n = /\bname="([^"]*)"/.exec(t)?.[1];
    const v = /\bvalue="([^"]*)"/.exec(t)?.[1] ?? "";
    if (n) fields.push([decode(n), decode(v)]);
  }
  return fields;
}
// Isolate the <form> that contains a given marker (so we don't mix the reply
// form's action fields with the header logout form's).
function formContaining(html, marker) {
  const idx = html.indexOf(marker);
  if (idx < 0) return "";
  const start = html.lastIndexOf("<form", idx);
  const end = html.indexOf("</form>", idx);
  return html.slice(start, end);
}
function sessionCookie(res) {
  const all = res.headers.getSetCookie?.() ?? [];
  return all.find((c) => c.startsWith("session="))?.split(";")[0] ?? null;
}

async function login() {
  const page = await fetch(`${BASE}/en/login`).then((r) => r.text());
  const fd = new FormData();
  for (const [n, v] of hiddenFields(formContaining(page, 'name="email"') || page)) fd.append(n, v);
  fd.set("locale", "en");
  fd.set("email", "admin@forum.local");
  fd.set("password", "admin1234");
  const res = await fetch(`${BASE}/en/login`, { method: "POST", body: fd, redirect: "manual" });
  return sessionCookie(res);
}

async function postReply(cookie, replyFormHtml, body, parentId) {
  const fd = new FormData();
  for (const [n, v] of hiddenFields(replyFormHtml)) fd.append(n, v);
  fd.set("body", body);
  if (parentId) fd.set("parentId", parentId);
  await fetch(`${BASE}/en/p/${SLUG}`, { method: "POST", body: fd, headers: { cookie }, redirect: "manual" });
}

const results = [];
const check = (n, c) => { results.push([n, c]); console.log(`${c ? "✓" : "✗"} ${n}`); };

const cookie = await login();
check("logged in as admin", !!cookie);

const uniq = process.argv[2] || String(process.pid);
const topText = `E2E top reply ${uniq}`;
const nestedText = `E2E nested reply ${uniq}`;

// Top-level reply
let html = await fetch(`${BASE}/en/p/${SLUG}`, { headers: { cookie } }).then((r) => r.text());
check("post page renders interactive vote control", html.includes("aria-pressed") && html.includes("vote-count"));
check("post page shows the reply composer", html.includes('name="postId"'));

await postReply(cookie, formContaining(html, 'name="postId"'), topText);
html = await fetch(`${BASE}/en/p/${SLUG}`, { headers: { cookie } }).then((r) => r.text());
check("top-level reply appears", html.includes(topText));

// Nested reply under the first existing reply
const parentId = /id="r-([a-z0-9]+)"/.exec(html)?.[1];
check("found a parent reply to nest under", !!parentId);
await postReply(cookie, formContaining(html, 'name="postId"'), nestedText, parentId);
html = await fetch(`${BASE}/en/p/${SLUG}`, { headers: { cookie } }).then((r) => r.text());
check("nested reply appears", html.includes(nestedText));
check("nested thread is rendered (reply-thread)", html.includes("reply-thread"));

const failed = results.filter(([, c]) => !c);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
