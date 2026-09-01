import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { db } from "@/lib/db";
import { consumeToken } from "@/lib/auth-tokens";
import { auditEvent } from "@/lib/audit";
import { AuthBrand } from "@/components/AuthBrand";

export const dynamic = "force-dynamic";

// Confirms an email from the link, and also serves the "we sent you a link"
// acknowledgement after a resend (?sent=1). Deliberately not gated on being
// logged in — people click the link from their inbox on any device.
export default async function VerifyPage({ params, searchParams }: PageProps<"/[lang]/verify">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.auth;
  const sp = await searchParams;

  let title: string;
  let body: string;

  if (sp.sent === "1") {
    title = t.verifySentTitle;
    body = t.verifySentBody;
  } else {
    const token = typeof sp.token === "string" ? sp.token : "";
    const userId = await consumeToken(token, "EMAIL_VERIFY");
    if (userId) {
      const u = await db.user.update({ where: { id: userId }, data: { emailVerified: true }, select: { forumName: true, role: true } });
      await auditEvent({
        action: "auth.verify.completed",
        actor: { id: userId, name: u.forumName, role: u.role },
        model: "User",
        targetId: userId,
        targetLabel: u.forumName,
        summary: "email address confirmed via link",
      });
      title = t.verifyOkTitle;
      body = t.verifyOkBody;
    } else {
      if (token) await auditEvent({ action: "auth.verify.completed", outcome: "failed", severity: "notice", summary: "invalid or expired verification link" });
      title = t.verifyFailTitle;
      body = t.verifyFailBody;
    }
  }

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <AuthBrand locale={lang} appName={dict.common.appName} />
        <h1 className="auth-title">{title}</h1>
        <p className="auth-sub">{body}</p>
        <Link href={`/${lang}`} className="btn btn-primary btn-full">
          {t.goHome}
        </Link>
      </div>
    </main>
  );
}
