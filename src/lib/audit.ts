import { createHash, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getSession } from "@/lib/session";
import { postExcerpt } from "@/lib/format";

// Activity / audit log.
//
// Two layers feed the AuditLog table:
//
//  1. The Prisma client extension (`auditExtension`) — wraps every
//     create/update/delete/upsert/*Many on audited models. It reads the row
//     before the write, runs the write, and records which fields changed and
//     their from → to values. Because it sits underneath every server action,
//     nothing can be forgotten: a new action gets logged the day it ships.
//
//  2. Explicit events (`auditEvent`) — for things that aren't row changes or
//     whose meaning the row change doesn't carry: logins and failures,
//     lockouts, password resets, denied actions, acting-as switches.
//
// Actor + IP come from the request the write runs in (session cookie and
// Cloudflare / proxy headers), resolved once per request and cached.
//
// Deliberately NOT imported from "server-only": db.ts pulls this in, and the
// seed script must stay importable under plain Node.

export type AuditSeverity = "info" | "notice" | "warning";
export type AuditOutcome = "ok" | "denied" | "failed";

export type AuditChange = { from: unknown; to: unknown };
export type AuditChanges = Record<string, AuditChange>;

// --- what is (not) recorded --------------------------------------------------

// Models whose writes are pure telemetry, derived data, or their own ledger.
const SKIP_MODELS = new Set([
  "AuditLog", // itself
  "VisitorDay", // one row per visitor per day — telemetry, not activity
  "Notification", // derived from the events that are already logged
  "AiUsage", // per-call ledger with its own admin page
  "AiBalance", // moves on every AI call
  "AuthToken", // holds token hashes; issuance/consumption is logged as events
]);

// Fields that change on their own (counters, timestamps) — an update touching
// only these is not an action anyone took.
const NOISE_FIELDS = new Set([
  "updatedAt",
  "lastSeenAt", // presence touch in getCurrentUser()
  "views", // listing view counters
  "score", // denormalised vote totals (the vote row itself is logged)
  "ratingSum",
  "ratingCount",
  "lastMessageAt",
  "lastReadAt",
  "failedLogins", // login failures are logged as auth.* events with context
  "lockedUntil",
]);

// Values that must never land in the log in clear.
const SECRET_FIELD = /password|token|secret|apikey|api_key/i;

const MAX_STRING = 2_000; // longer strings are replaced by a digest + preview
const MANY_CAP = 50; // rows kept for updateMany / deleteMany snapshots

// Human handle for a row, tried in order.
const LABEL_FIELDS = ["title", "name", "nameEn", "forumName", "slug", "key", "number", "label", "email"] as const;

// --- request context --------------------------------------------------------

export type AuditContext = {
  requestId: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  actingAsId: string | null;
  ip: string | null;
  country: string | null;
  userAgent: string | null;
  path: string | null;
};

type BaseClient = PrismaClient;

// The un-extended client lives on globalThis, not in a module variable: Next
// compiles route handlers and pages into separate module graphs, so this file
// can be instantiated more than once per process while the PrismaClient (also
// kept on globalThis by db.ts) is created only once. A module-level slot would
// stay null in every copy but the one that built the client, and events from
// /api/* routes would silently vanish.
const slot = globalThis as unknown as { __auditBaseClient?: BaseClient };

/** Called from db.ts when the client is built, so events can write without importing db. */
export function setAuditClient(client: BaseClient): void {
  slot.__auditBaseClient = client;
}

function client(): BaseClient {
  const c = slot.__auditBaseClient;
  if (!c) throw new Error("audit client not initialised — import @/lib/db before logging");
  return c;
}

// Resolved once per request. Memoised on the request's own `headers()`
// object rather than with React's cache(): the latter only spans a render, so
// two writes inside one server action were getting two request ids and could
// not be grouped. Next hands back the same ReadonlyHeaders instance for the
// whole request (pages, actions and route handlers alike), which makes it a
// reliable key; outside a request (scripts, build) there is no key and the
// context is simply rebuilt per call. The promise is stored, not the value,
// so concurrent writes racing on a cold key still share one id.
const contexts = new WeakMap<object, Promise<AuditContext>>();

async function getContext(): Promise<AuditContext> {
  let h: Awaited<ReturnType<typeof headers>> | null = null;
  try {
    h = await headers();
  } catch {
    // no request scope
  }
  if (h) {
    const hit = contexts.get(h);
    if (hit) return hit;
  }
  const pending = buildContext(h);
  if (h) contexts.set(h, pending);
  return pending;
}

async function buildContext(h: Awaited<ReturnType<typeof headers>> | null): Promise<AuditContext> {
  const ctx: AuditContext = {
    requestId: randomUUID(),
    actorId: null,
    actorName: null,
    actorRole: null,
    actingAsId: null,
    ip: null,
    country: null,
    userAgent: null,
    path: null,
  };

  // Request headers — absent outside a request (build, scripts).
  if (h) {
    ctx.ip =
      h.get("cf-connecting-ip") ??
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    ctx.country = h.get("cf-ipcountry");
    ctx.userAgent = h.get("user-agent")?.slice(0, 300) ?? null;
    const referer = h.get("referer");
    if (referer) {
      try {
        ctx.path = new URL(referer).pathname;
      } catch {
        ctx.path = null;
      }
    }
  }

  try {
    const session = await getSession();
    if (session?.userId) {
      ctx.actorId = session.userId;
      ctx.actorRole = session.role;
      // Name + current role from the DB, so a stale JWT role can't mislabel
      // an entry. Base client: reads aren't intercepted, no recursion.
      const row = await client().user.findUnique({
        where: { id: session.userId },
        select: { forumName: true, role: true },
      });
      if (row) {
        ctx.actorName = row.forumName;
        ctx.actorRole = row.role;
      }
    }
    ctx.actingAsId = (await cookies()).get("acting_as")?.value ?? null;
  } catch {
    // no cookie scope
  }

  return ctx;
}

// --- value handling ---------------------------------------------------------

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date);
}

// Canonical string for change detection.
function canon(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && v !== null) return JSON.stringify(v);
  return String(v);
}

// A JSON-safe, size-bounded, secret-free rendering of one field value.
function sanitize(model: string, field: string, value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (SECRET_FIELD.test(field)) return "[redacted]";
  // Private messages: the fact of a message is logged, its text is not.
  if (model === "Message" && field === "body") {
    return `[private message · ${typeof value === "string" ? value.length : 0} chars]`;
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") return bound(value);
  if (Array.isArray(value)) {
    return value.length > MANY_CAP
      ? { truncated: true, length: value.length, preview: value.slice(0, 10).map((x) => sanitize(model, field, x)) }
      : value.map((x) => sanitize(model, field, x));
  }
  if (isPlainObject(value)) {
    // Rich-text documents and other JSON columns: keep them whole when small,
    // otherwise a digest plus a plain-text preview so an edit is still
    // reviewable and provably distinct.
    const text = JSON.stringify(value);
    if (text.length <= MAX_STRING) return value;
    return {
      truncated: true,
      length: text.length,
      sha256: createHash("sha256").update(text).digest("hex").slice(0, 16),
      preview: (postExcerpt(value) || text).slice(0, 300),
    };
  }
  return value;
}

function bound(s: string): unknown {
  if (s.length <= MAX_STRING) return s;
  return {
    truncated: true,
    length: s.length,
    sha256: createHash("sha256").update(s).digest("hex").slice(0, 16),
    preview: s.slice(0, 300),
  };
}

// Whole-row snapshot (create / delete), scalars only.
function snapshotOf(model: string, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (isPlainObject(v) && !(model === "Post" || model === "Reply") && k !== "body") continue; // relation include
    out[k] = sanitize(model, k, v);
  }
  return out;
}

function diff(model: string, before: Record<string, unknown>, after: Record<string, unknown>): AuditChanges {
  const changes: AuditChanges = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    if (NOISE_FIELDS.has(k)) continue;
    const a = before[k];
    const b = after[k];
    // Relations included on the result are objects/arrays of rows — not fields.
    if ((isPlainObject(a) || isPlainObject(b)) && k !== "body") continue;
    if (Array.isArray(a) && a.length && isPlainObject(a[0])) continue;
    if (b === undefined) continue; // not selected on the result
    if (canon(a) === canon(b)) continue;
    changes[k] = { from: sanitize(model, k, a), to: sanitize(model, k, b) };
  }
  return changes;
}

function labelFor(model: string, row: Record<string, unknown> | null): string | null {
  if (!row) return null;
  if (model === "Reply" || model === "Post") {
    if (typeof row.title === "string") return row.title;
    const text = postExcerpt(row.body);
    if (text) return text.slice(0, 80);
  }
  if (model === "Message") return null; // private
  for (const f of LABEL_FIELDS) {
    const v = row[f];
    if (typeof v === "string" && v) return v.slice(0, 120);
    if (typeof v === "number") return String(v);
  }
  return null;
}

function idOf(row: Record<string, unknown> | null): string | null {
  if (!row) return null;
  if (typeof row.id === "string") return row.id;
  // Composite keys (SavedPost, Block, …): join the foreign keys.
  const parts = Object.entries(row)
    .filter(([k, v]) => k.endsWith("Id") && typeof v === "string")
    .map(([, v]) => v as string);
  return parts.length ? parts.join(":") : null;
}

function short(v: unknown): string {
  if (v === null || v === undefined) return "∅";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (typeof v === "string") return v.length > 40 ? `"${v.slice(0, 37)}…"` : `"${v}"`;
  if (Array.isArray(v)) return `[${v.length}]`;
  if (isPlainObject(v) && v.truncated) return `{${v.length} chars}`;
  return "{…}";
}

function summaryOfChanges(changes: AuditChanges): string {
  const fields = Object.keys(changes);
  const shown = fields.slice(0, 3).map((f) => `${f}: ${short(changes[f].from)} → ${short(changes[f].to)}`);
  const more = fields.length > 3 ? ` · +${fields.length - 3} more` : "";
  return shown.join(" · ") + more;
}

// --- severity ---------------------------------------------------------------

const USER_SECURITY_FIELDS = new Set(["role", "status", "isOwner", "canAccessAdmin", "canRevealAnon", "passwordHash", "email"]);
const USER_TIER_FIELDS = new Set(["isPro", "isDonor", "isSupporter"]);
const MODERATION_FIELDS = new Set(["hidden", "repliesLocked", "active", "status", "featured", "removedReason", "locked"]);
const WARNING_DELETE_MODELS = new Set(["User", "Category", "Business", "PaidPackage", "Feature", "MerchProduct", "Label", "AdCard", "AiPackage"]);
const NOTICE_MODELS = new Set(["Report", "Block", "Subscription", "UserPackage", "SiteSetting", "PackageFeature", "BusinessManager"]);

function severityFor(model: string, op: string, changes: AuditChanges | null, outcome: AuditOutcome): AuditSeverity {
  if (outcome === "denied") return "warning";
  const fields = changes ? Object.keys(changes) : [];
  if (model === "SiteSetting") return "warning";
  if (model === "User") {
    if (fields.some((f) => USER_SECURITY_FIELDS.has(f))) return "warning";
    if (fields.some((f) => USER_TIER_FIELDS.has(f))) return "notice";
  }
  if (op === "delete" || op === "deleteMany") return WARNING_DELETE_MODELS.has(model) ? "warning" : "notice";
  if (fields.some((f) => MODERATION_FIELDS.has(f))) return "notice";
  if (NOTICE_MODELS.has(model)) return "notice";
  if (outcome === "failed") return "notice";
  return "info";
}

// --- writer -----------------------------------------------------------------

type Entry = {
  action: string;
  summary: string;
  severity?: AuditSeverity;
  outcome?: AuditOutcome;
  model?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  changes?: AuditChanges | null;
  snapshot?: Record<string, unknown> | Record<string, unknown>[] | null;
  meta?: Record<string, unknown> | null;
  /** Override the session actor (login flows, where there is no session yet). */
  actor?: { id: string | null; name?: string | null; role?: string | null };
};

async function write(entry: Entry): Promise<void> {
  const ctx = await getContext();
  const actorId = entry.actor ? entry.actor.id : ctx.actorId;
  const actorName = entry.actor ? (entry.actor.name ?? null) : ctx.actorName;
  const actorRole = entry.actor ? (entry.actor.role ?? null) : ctx.actorRole;
  await client().auditLog.create({
    data: {
      requestId: ctx.requestId,
      actorId,
      actorName,
      actorRole,
      actingAsId: ctx.actingAsId,
      action: entry.action,
      severity: entry.severity ?? "info",
      outcome: entry.outcome ?? "ok",
      model: entry.model ?? null,
      targetId: entry.targetId ?? null,
      targetLabel: entry.targetLabel ?? null,
      summary: entry.summary.slice(0, 500),
      changes: entry.changes ? (entry.changes as Prisma.InputJsonValue) : undefined,
      snapshot: entry.snapshot ? (entry.snapshot as Prisma.InputJsonValue) : undefined,
      meta: entry.meta ? (entry.meta as Prisma.InputJsonValue) : undefined,
      ip: ctx.ip,
      country: ctx.country,
      userAgent: ctx.userAgent,
      path: ctx.path,
    },
  });
}

/**
 * Record an explicit event. Never throws — an audit hiccup must not break the
 * action being audited (the failure is reported to the server log instead).
 */
export async function auditEvent(entry: Entry): Promise<void> {
  try {
    await write(entry);
  } catch (err) {
    console.error("[audit] failed to record", entry.action, err instanceof Error ? err.message : err);
  }
}

// --- Prisma extension -------------------------------------------------------

const MUTATIONS = new Set([
  "create",
  "update",
  "delete",
  "upsert",
  "createMany",
  "createManyAndReturn",
  "updateMany",
  "updateManyAndReturn",
  "deleteMany",
]);

type Args = {
  where?: unknown;
  data?: unknown;
  select?: unknown;
  create?: unknown;
  update?: unknown;
};
type Row = Record<string, unknown>;

// Model delegate for pre/post reads on the base client. Narrow cast in one
// place: the extension is generic over models, the client's types are not.
function delegate(model: string) {
  const name = model.charAt(0).toLowerCase() + model.slice(1);
  return (client() as unknown as Record<string, { findUnique: (a: unknown) => Promise<Row | null>; findMany: (a: unknown) => Promise<Row[]> }>)[name];
}

// Nested relation writes in `data` (labels: { set: [...] }) don't show up in a
// scalar diff; keep the intent in meta instead, reduced to ids where possible.
const RELATION_OPS = new Set(["connect", "disconnect", "set", "create", "delete", "update", "upsert", "connectOrCreate", "createMany", "updateMany", "deleteMany"]);
function relationWrites(data: unknown): Record<string, unknown> | null {
  if (!isPlainObject(data)) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!isPlainObject(v)) continue;
    const ops = Object.keys(v);
    if (!ops.length || !ops.every((o) => RELATION_OPS.has(o))) continue;
    out[k] = Object.fromEntries(
      ops.map((o) => {
        const val = v[o];
        const ids = Array.isArray(val) ? val.map((x) => (isPlainObject(x) && typeof x.id === "string" ? x.id : x)) : val;
        return [o, Array.isArray(ids) && ids.length > MANY_CAP ? { count: ids.length } : ids];
      }),
    );
  }
  return Object.keys(out).length ? out : null;
}

// Scalar values from an update `data` object ({ set: v } / { increment: n } unwrapped as text).
function scalarData(model: string, data: unknown): Record<string, unknown> {
  if (!isPlainObject(data)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (isPlainObject(v)) {
      if ("set" in v) out[k] = sanitize(model, k, v.set);
      else if ("increment" in v) out[k] = `+${v.increment}`;
      else if ("decrement" in v) out[k] = `-${v.decrement}`;
      continue; // relation write
    }
    out[k] = sanitize(model, k, v);
  }
  return out;
}

function errorCode(e: unknown): string {
  if (e && typeof e === "object" && "code" in e && typeof (e as { code: unknown }).code === "string") return (e as { code: string }).code;
  return e instanceof Error ? e.name : "Error";
}

export function auditExtension() {
  return Prisma.defineExtension({
    name: "audit",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!MUTATIONS.has(operation) || SKIP_MODELS.has(model)) return query(args);
          const a = args as Args;

          // Counter bumps and presence touches: skip before spending a read.
          if ((operation === "update" || operation === "updateMany") && isPlainObject(a.data)) {
            const keys = Object.keys(a.data);
            if (keys.length && keys.every((k) => NOISE_FIELDS.has(k))) return query(args);
          }

          const d = delegate(model);
          let before: Row | Row[] | null = null;
          try {
            if (operation === "update" || operation === "delete" || operation === "upsert") {
              before = d ? await d.findUnique({ where: a.where }) : null;
            } else if (operation === "updateMany" || operation === "updateManyAndReturn" || operation === "deleteMany") {
              before = d ? await d.findMany({ where: a.where, take: MANY_CAP + 1 }) : null;
            }
          } catch {
            before = null;
          }

          let result: unknown;
          let failure: unknown = null;
          try {
            result = await query(args);
          } catch (e) {
            failure = e;
          }

          try {
            await recordMutation(model, operation, a, before, result, failure);
          } catch (err) {
            console.error("[audit] failed to record", `${model}.${operation}`, err instanceof Error ? err.message : err);
          }

          if (failure) throw failure;
          return result;
        },
      },
    },
  });
}

async function recordMutation(
  model: string,
  operation: string,
  a: Args,
  before: Row | Row[] | null,
  result: unknown,
  failure: unknown,
): Promise<void> {
  const outcome: AuditOutcome = failure ? "failed" : "ok";
  const meta: Record<string, unknown> = {};
  if (failure) meta.error = errorCode(failure);
  const rel = relationWrites(a.data ?? a.update);
  if (rel) meta.relations = rel;

  // Bulk operations: one entry with the count, the applied data and the rows
  // it touched (capped).
  if (operation === "updateMany" || operation === "updateManyAndReturn" || operation === "deleteMany" || operation === "createMany" || operation === "createManyAndReturn") {
    const rows = Array.isArray(before) ? before : [];
    const count = Array.isArray(result) ? result.length : isPlainObject(result) && typeof result.count === "number" ? result.count : rows.length;
    const isDelete = operation === "deleteMany";
    const isCreate = operation.startsWith("createMany");
    const applied = isCreate ? undefined : scalarData(model, a.data);
    meta.count = count;
    if (rows.length > MANY_CAP) meta.snapshotTruncated = true;
    if (!isCreate) meta.ids = rows.slice(0, MANY_CAP).map(idOf);
    if (applied && Object.keys(applied).length) meta.data = applied;
    if (isCreate && Array.isArray(a.data)) meta.data = a.data.slice(0, 10).map((r) => (isPlainObject(r) ? snapshotOf(model, r) : r));
    if (!isDelete && !isCreate && count === 0 && !failure) return; // matched nothing
    const verb = isDelete ? "deleted" : isCreate ? "created" : "updated";
    const summary = applied && Object.keys(applied).length
      ? `${count} ${verb} · ${Object.entries(applied).slice(0, 3).map(([k, v]) => `${k} → ${short(v)}`).join(" · ")}`
      : `${count} ${verb}`;
    await write({
      action: `${model}.${operation}`,
      model,
      summary,
      severity: severityFor(model, operation, null, outcome),
      outcome,
      snapshot: isDelete && rows.length ? rows.slice(0, MANY_CAP).map((r) => snapshotOf(model, r)) : null,
      meta,
    });
    return;
  }

  const beforeRow = isPlainObject(before) ? before : null;
  const resultRow = isPlainObject(result) ? result : null;
  const effective = operation === "upsert" ? (beforeRow ? "update" : "create") : operation;

  if (effective === "create") {
    // The result carries the row unless the caller narrowed it with `select`;
    // re-read in that case so the snapshot is complete.
    let row = resultRow;
    if (row && a.select && typeof row.id === "string") {
      const full = await delegate(model)?.findUnique({ where: { id: row.id } });
      if (full) row = full;
    }
    if (!row && failure) {
      const label = labelFor(model, isPlainObject(a.data) ? (a.data as Row) : null);
      await write({ action: `${model}.create`, model, summary: `create failed (${meta.error})`, severity: "notice", outcome, targetLabel: label, meta });
      return;
    }
    if (!row) return;
    const label = labelFor(model, row);
    if (typeof row.slug === "string") meta.slug = row.slug;
    await write({
      action: `${model}.create`,
      model,
      targetId: idOf(row),
      targetLabel: label,
      summary: label ? `created "${label.slice(0, 80)}"` : "created",
      severity: severityFor(model, "create", null, outcome),
      outcome,
      snapshot: snapshotOf(model, row),
      meta: Object.keys(meta).length ? meta : null,
    });
    return;
  }

  if (effective === "delete") {
    const label = labelFor(model, beforeRow);
    if (beforeRow && typeof beforeRow.slug === "string") meta.slug = beforeRow.slug;
    if (!beforeRow && !failure) return; // nothing was there
    await write({
      action: `${model}.delete`,
      model,
      targetId: idOf(beforeRow),
      targetLabel: label,
      summary: failure ? `delete failed (${meta.error})` : label ? `deleted "${label.slice(0, 80)}"` : "deleted",
      severity: severityFor(model, "delete", null, outcome),
      outcome,
      snapshot: beforeRow ? snapshotOf(model, beforeRow) : null,
      meta: Object.keys(meta).length ? meta : null,
    });
    return;
  }

  // update
  if (!beforeRow) {
    if (!failure) return; // nothing matched — Prisma would have thrown; be safe
    await write({ action: `${model}.update`, model, summary: `update failed (${meta.error})`, severity: "notice", outcome, meta });
    return;
  }
  let afterRow = resultRow;
  if (failure) afterRow = null;
  else if (!afterRow || a.select) {
    const d = delegate(model);
    afterRow = (d && ((await d.findUnique({ where: a.where }).catch(() => null)) ?? (typeof beforeRow.id === "string" ? await d.findUnique({ where: { id: beforeRow.id } }).catch(() => null) : null))) ?? null;
  }
  const changes = afterRow ? diff(model, beforeRow, afterRow) : null;
  if (!failure && changes && Object.keys(changes).length === 0 && !rel) return; // nothing actually changed

  const label = labelFor(model, afterRow ?? beforeRow);
  const slug = (afterRow ?? beforeRow).slug;
  if (typeof slug === "string") meta.slug = slug;
  await write({
    action: `${model}.update`,
    model,
    targetId: idOf(beforeRow),
    targetLabel: label,
    summary: failure
      ? `update failed (${meta.error})`
      : changes && Object.keys(changes).length
        ? summaryOfChanges(changes)
        : rel
          ? `relations: ${Object.keys(rel).join(", ")}`
          : "updated",
    severity: severityFor(model, "update", changes, outcome),
    outcome,
    changes: changes && Object.keys(changes).length ? changes : null,
    meta: Object.keys(meta).length ? meta : null,
  });
}
