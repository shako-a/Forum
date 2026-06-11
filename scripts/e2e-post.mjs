// Throwaway end-to-end check for post creation: logs in as admin, submits a
// rich-text post through the real createPost server action (no-JS form replay),
// then confirms it renders on its page and appears in the feed.
//
// Run: node scripts/e2e-post.mjs   (dev server must be running on :3000)

const BASE = "http://localhost:3000";

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
    const tag = m[1];
    const name = /\bname="([^"]*)"/.exec(tag)?.[1];
    const value = /\bvalue="([^"]*)"/.exec(tag)?.[1] ?? "";
    if (name) fields.push([decode(name), decode(value)]);
  }
  return fields;
}
function sessionCookie(res) {
  const all = res.headers.getSetCookie?.() ?? [];
  const s = all.find((c) => c.startsWith("session="));
  return s ? s.split(";")[0] : null;
}

async function login() {
  const page = await fetch(`${BASE}/en/login`).then((r) => r.text());
  const fd = new FormData();
  for (const [n, v] of hiddenFields(page)) fd.append(n, v);
  fd.set("locale", "en");
  fd.set("email", "admin@forum.local");
  fd.set("password", "admin1234");
  const res = await fetch(`${BASE}/en/login`, { method: "POST", body: fd, redirect: "manual" });
  return sessionCookie(res);
}

const results = [];
const check = (name, cond) => {
  results.push([name, cond]);
  console.log(`${cond ? "✓" : "✗"} ${name}`);
};

const cookie = await login();
check("logged in as admin", !!cookie);

// Load create page, grab hidden fields + the Discussions category id.
const createHtml = await fetch(`${BASE}/en/create`, { headers: { cookie } }).then((r) => r.text());
const catId = /<option value="([^"]+)">Discussions<\/option>/.exec(createHtml)?.[1];
check("create page lists Discussions category", !!catId);

const uniq = process.argv[2] || String(process.pid);
const title = `E2E Rich Post ${uniq}`;
const body = JSON.stringify({
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "E2E Heading" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Hello with a " },
        { type: "text", marks: [{ type: "bold" }], text: "bold" },
        { type: "text", text: " word and a " },
        { type: "text", marks: [{ type: "link", attrs: { href: "https://example.com" } }], text: "link" },
        { type: "text", text: "." },
      ],
    },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "first item" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "second item" }] }] },
      ],
    },
  ],
});

const fd = new FormData();
for (const [n, v] of hiddenFields(createHtml)) fd.append(n, v);
fd.set("locale", "en");
fd.set("categoryId", catId ?? "");
fd.set("title", title);
fd.set("body", body);

const res = await fetch(`${BASE}/en/create`, { method: "POST", body: fd, headers: { cookie }, redirect: "manual" });
check("createPost redirects to the new post", res.status >= 300 && res.status < 400);
const loc = res.headers.get("location") || "";
check("redirect target is /en/p/<slug>", /\/en\/p\/[a-z0-9-]+/.test(loc));

// View the post page.
const postHtml = await fetch(loc.startsWith("http") ? loc : `${BASE}${loc}`, { headers: { cookie } }).then((r) => r.text());
check("post page shows the title", postHtml.includes(title));
check("post page renders heading", postHtml.includes("E2E Heading"));
check("post page renders bold mark", postHtml.includes("<strong>bold</strong>"));
check("post page renders safe link", postHtml.includes('href="https://example.com"') && postHtml.includes('rel="nofollow noopener"'));
check("post page renders bullet list", postHtml.includes("<li>") && postHtml.includes("first item"));

// Appears in the home feed (Discussions is an unlocked category → visible to all).
const homeHtml = await fetch(`${BASE}/en`, { headers: { cookie } }).then((r) => r.text());
check("post appears in the feed", homeHtml.includes(title));

const failed = results.filter(([, c]) => !c);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (loc) console.log(`(created: ${loc})`);
process.exit(failed.length ? 1 : 0);
