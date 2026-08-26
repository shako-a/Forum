import type { Prisma } from "@/generated/prisma/client";

// Filter parsing + where-building for the activity log, shared by the admin
// page and the CSV export so both see exactly the same rows.

export const AUDIT_QUICK = ["all", "security", "staff", "auth", "content", "listings", "users", "messages"] as const;
export type AuditQuick = (typeof AUDIT_QUICK)[number];

export const AUDIT_PER = [50, 100, 200] as const;

export const AUDIT_SEVERITIES = ["info", "notice", "warning"] as const;
export const AUDIT_OUTCOMES = ["ok", "denied", "failed"] as const;

// Row-change models, in the order they appear in the filter dropdown.
export const AUDITED_MODELS = [
  "User",
  "Post",
  "Reply",
  "Category",
  "Business",
  "JobPosting",
  "PropertyListing",
  "MarketListing",
  "AutoListing",
  "MerchProduct",
  "MerchVariant",
  "MerchOrder",
  "MerchOrderItem",
  "AdCard",
  "Label",
  "PaidPackage",
  "Feature",
  "PackageFeature",
  "UserPackage",
  "Subscription",
  "Report",
  "Block",
  "Message",
  "Conversation",
  "ConversationParticipant",
  "PostVote",
  "ReplyVote",
  "SavedPost",
  "MarketFavorite",
  "BusinessReview",
  "MarketSellerReview",
  "BusinessManager",
  "MediaUpload",
  "SiteSetting",
  "AiPackage",
] as const;

// Explicit (non-row) events, see auditEvent() call sites.
export const AUDIT_EVENTS = [
  "auth.login",
  "auth.login.failed",
  "auth.login.lockout",
  "auth.login.locked",
  "auth.logout",
  "auth.signup",
  "auth.reset.requested",
  "auth.reset.completed",
  "auth.verify.sent",
  "auth.verify.completed",
  "access.denied",
  "acting.start",
  "acting.stop",
  "media.upload.denied",
] as const;

const LISTING_MODELS = ["PropertyListing", "MarketListing", "AutoListing", "JobPosting", "Business", "MerchProduct", "MerchOrder"];
const CONTENT_MODELS = ["Post", "Reply", "PostVote", "ReplyVote", "SavedPost"];
const USER_MODELS = ["User", "Subscription", "UserPackage", "Block", "Report"];
const MESSAGE_MODELS = ["Message", "Conversation", "ConversationParticipant"];

export type AuditFilters = {
  quick: AuditQuick;
  q: string;
  actor: string; // actor id, or a name fragment
  action: string; // exact action, or "Model." prefix
  model: string;
  severity: string;
  outcome: string;
  ip: string;
  target: string;
  req: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  page: number;
  per: number;
};

type SP = Record<string, string | string[] | undefined>;

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim().slice(0, 200) : "");
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseAuditFilters(sp: SP): AuditFilters {
  const quickRaw = str(sp.quick);
  const per = Number(str(sp.per));
  const page = Math.max(1, Math.floor(Number(str(sp.page)) || 1));
  const from = str(sp.from);
  const to = str(sp.to);
  return {
    quick: (AUDIT_QUICK as readonly string[]).includes(quickRaw) ? (quickRaw as AuditQuick) : "all",
    q: str(sp.q),
    actor: str(sp.actor),
    action: str(sp.action),
    model: str(sp.model),
    severity: (AUDIT_SEVERITIES as readonly string[]).includes(str(sp.severity)) ? str(sp.severity) : "",
    outcome: (AUDIT_OUTCOMES as readonly string[]).includes(str(sp.outcome)) ? str(sp.outcome) : "",
    ip: str(sp.ip),
    target: str(sp.target),
    req: str(sp.req),
    from: DATE_RE.test(from) ? from : "",
    to: DATE_RE.test(to) ? to : "",
    page,
    per: (AUDIT_PER as readonly number[]).includes(per) ? per : AUDIT_PER[0],
  };
}

// Looks like a cuid → exact id match; otherwise a name fragment.
const CUID_RE = /^c[a-z0-9]{20,}$/;

export function auditWhere(f: AuditFilters): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [];

  switch (f.quick) {
    case "security":
      and.push({ OR: [{ severity: "warning" }, { outcome: "denied" }, { action: { startsWith: "auth.login" } }] });
      break;
    case "staff":
      and.push({ actorRole: { in: ["ADMIN", "MODERATOR"] } });
      break;
    case "auth":
      and.push({ action: { startsWith: "auth." } });
      break;
    case "content":
      and.push({ model: { in: CONTENT_MODELS } });
      break;
    case "listings":
      and.push({ model: { in: LISTING_MODELS } });
      break;
    case "users":
      and.push({ OR: [{ model: { in: USER_MODELS } }, { action: { startsWith: "auth." } }, { action: "access.denied" }] });
      break;
    case "messages":
      and.push({ model: { in: MESSAGE_MODELS } });
      break;
  }

  if (f.q) {
    and.push({
      OR: [
        { summary: { contains: f.q, mode: "insensitive" } },
        { targetLabel: { contains: f.q, mode: "insensitive" } },
        { actorName: { contains: f.q, mode: "insensitive" } },
        { action: { contains: f.q, mode: "insensitive" } },
        { targetId: f.q },
        { ip: { startsWith: f.q } },
      ],
    });
  }
  if (f.actor) {
    and.push(CUID_RE.test(f.actor) ? { actorId: f.actor } : { actorName: { contains: f.actor, mode: "insensitive" } });
  }
  // "User." = every action on users; ".delete" = every deletion; else exact.
  if (f.action) {
    and.push(
      f.action.endsWith(".") ? { action: { startsWith: f.action } } : f.action.startsWith(".") ? { action: { endsWith: f.action } } : { action: f.action },
    );
  }
  if (f.model) and.push({ model: f.model });
  if (f.severity) and.push({ severity: f.severity });
  if (f.outcome) and.push({ outcome: f.outcome });
  if (f.ip) and.push({ ip: { startsWith: f.ip } });
  if (f.target) and.push({ targetId: f.target });
  if (f.req) and.push({ requestId: f.req });
  if (f.from) and.push({ at: { gte: new Date(`${f.from}T00:00:00.000Z`) } });
  if (f.to) and.push({ at: { lte: new Date(`${f.to}T23:59:59.999Z`) } });

  return and.length ? { AND: and } : {};
}

/** Query string for a link that keeps the current filters and applies `patch`. */
export function auditQuery(f: AuditFilters, patch: Partial<Record<keyof AuditFilters, string | number | null>> = {}): string {
  const merged: Record<string, string | number> = {};
  const keys: (keyof AuditFilters)[] = ["quick", "q", "actor", "action", "model", "severity", "outcome", "ip", "target", "req", "from", "to", "per", "page"];
  for (const k of keys) {
    const v = k in patch ? patch[k] : f[k];
    if (v === null || v === undefined || v === "" || (k === "quick" && v === "all") || (k === "page" && Number(v) <= 1) || (k === "per" && Number(v) === AUDIT_PER[0])) continue;
    merged[k] = v;
  }
  // Any change of filter resets paging unless the patch sets the page itself.
  if (!("page" in patch)) delete merged.page;
  const qs = new URLSearchParams(Object.entries(merged).map(([k, v]) => [k, String(v)])).toString();
  return qs ? `?${qs}` : "";
}

/** Where the affected record lives, when there is a page for it. */
export function auditTargetHref(locale: string, model: string | null, targetId: string | null, meta: unknown): string | null {
  if (!model || !targetId) return null;
  const slug = meta && typeof meta === "object" && typeof (meta as { slug?: unknown }).slug === "string" ? (meta as { slug: string }).slug : null;
  switch (model) {
    case "User":
      return `/${locale}/admin/users/${targetId}`;
    case "Post":
      return slug ? `/${locale}/p/${slug}` : null;
    case "Category":
      return slug ? `/${locale}/c/${slug}` : `/${locale}/admin/categories`;
    case "Business":
      return slug ? `/${locale}/business/${slug}` : `/${locale}/admin/businesses`;
    case "PropertyListing":
      return slug ? `/${locale}/realestate/${slug}` : `/${locale}/admin/estate`;
    case "MarketListing":
      return slug ? `/${locale}/market/${slug}` : `/${locale}/admin/market`;
    case "AutoListing":
      return slug ? `/${locale}/auto/${slug}` : `/${locale}/admin/auto`;
    case "MerchProduct":
      return `/${locale}/admin/merch/${targetId}`;
    case "MerchOrder":
      return `/${locale}/admin/merch/orders`;
    case "JobPosting":
      return `/${locale}/admin/jobs`;
    case "AdCard":
      return `/${locale}/admin/ad-cards`;
    case "Label":
      return `/${locale}/admin/labels`;
    case "PaidPackage":
      return `/${locale}/admin/more/${targetId}`;
    case "Report":
      return `/${locale}/admin/reports?status=all`;
    case "SiteSetting":
      return `/${locale}/admin/more`;
    case "AiPackage":
      return `/${locale}/admin/ai-usage?tab=packages`;
    default:
      return null;
  }
}
