import "server-only";
import type { Locale } from "@/i18n/config";

// Bilingual transactional email bodies. Kept as small inline-HTML builders (no
// template engine, no React Email dependency) — they are simple, and inlined
// styles are what email clients actually render reliably.

type Copy = {
  subject: string;
  heading: string;
  body: string;
  cta: string;
  ignore: string;
  footer: string;
};

const BRAND = "GeoGlobally";

const RESET: Record<Locale, Copy> = {
  en: {
    subject: `${BRAND} — reset your password`,
    heading: "Reset your password",
    body: "We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.",
    cta: "Reset password",
    ignore: "If you didn't request this, you can safely ignore this email — your password won't change.",
    footer: `${BRAND} — a community forum for Georgians in the US.`,
  },
  ka: {
    subject: `${BRAND} — პაროლის აღდგენა`,
    heading: "აღადგინე პაროლი",
    body: "მივიღეთ პაროლის აღდგენის მოთხოვნა. ახალი პაროლის ასარჩევად დააჭირე ღილაკს. ბმული ვადა გაუვა 1 საათში.",
    cta: "პაროლის აღდგენა",
    ignore: "თუ ეს მოთხოვნა შენ არ გამოგიგზავნია, უბრალოდ დააიგნორე ეს წერილი — პაროლი არ შეიცვლება.",
    footer: `${BRAND} — ქართველების საზოგადოება ამერიკაში.`,
  },
};

const VERIFY: Record<Locale, Copy> = {
  en: {
    subject: `${BRAND} — confirm your email`,
    heading: "Confirm your email",
    body: "Welcome to GeoGlobally! Confirm your email address to secure your account. This link expires in 24 hours.",
    cta: "Confirm email",
    ignore: "If you didn't create this account, you can ignore this email.",
    footer: `${BRAND} — a community forum for Georgians in the US.`,
  },
  ka: {
    subject: `${BRAND} — დაადასტურე ელ. ფოსტა`,
    heading: "დაადასტურე ელ. ფოსტა",
    body: "კეთილი იყოს შენი მობრძანება GeoGlobally-ზე! დაადასტურე ელ. ფოსტა ანგარიშის დასაცავად. ბმული ვადა გაუვა 24 საათში.",
    cta: "დადასტურება",
    ignore: "თუ ეს ანგარიში შენ არ შეგიქმნია, დააიგნორე ეს წერილი.",
    footer: `${BRAND} — ქართველების საზოგადოება ამერიკაში.`,
  },
};

function render(c: Copy, url: string): string {
  // Inline styles only — the reliable subset across email clients. Colors match
  // the brand red; layout is a single centered column.
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f6f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#171a21;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f9;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e9ef;">
          <tr><td style="height:4px;background:#d7263d;"></td></tr>
          <tr><td style="padding:28px 28px 8px;">
            <div style="font-weight:800;font-size:20px;color:#d7263d;">Geo<span style="color:#1f4e9c;">Globally</span></div>
          </td></tr>
          <tr><td style="padding:8px 28px 4px;">
            <h1 style="margin:0 0 10px;font-size:20px;">${c.heading}</h1>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#3d434f;">${c.body}</p>
            <a href="${url}" style="display:inline-block;background:#d7263d;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:999px;">${c.cta}</a>
            <p style="margin:22px 0 0;font-size:12.5px;line-height:1.5;color:#737a87;">${c.ignore}</p>
            <p style="margin:14px 0 0;font-size:12px;word-break:break-all;color:#737a87;">${url}</p>
          </td></tr>
          <tr><td style="padding:20px 28px 26px;border-top:1px solid #e6e9ef;margin-top:16px;">
            <p style="margin:16px 0 0;font-size:12px;color:#9aa1ad;">${c.footer}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function passwordResetEmail(locale: Locale, url: string): { subject: string; html: string } {
  const c = RESET[locale] ?? RESET.en;
  return { subject: c.subject, html: render(c, url) };
}

export function verificationEmail(locale: Locale, url: string): { subject: string; html: string } {
  const c = VERIFY[locale] ?? VERIFY.en;
  return { subject: c.subject, html: render(c, url) };
}
