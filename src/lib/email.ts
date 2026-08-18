import "server-only";
import { Resend } from "resend";

// Transactional email via Resend. Everything is behind an env check so the app
// runs perfectly with no email configured — the flows that need it degrade
// gracefully (see callers), and in local dev the link is logged to the console
// so you can exercise the whole flow without a real API key.
//
//   RESEND_API_KEY  the key from resend.com (starts with "re_")
//   EMAIL_FROM      e.g. 'GeoGlobally <noreply@send.geoglobally.com>'

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM;

export function isEmailConfigured(): boolean {
  return !!API_KEY && !!FROM;
}

let client: Resend | null = null;
function getClient(): Resend {
  if (!client) client = new Resend(API_KEY!);
  return client;
}

export type SendResult = { ok: true } | { ok: false; reason: "unconfigured" | "error" };

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  /** Where replies go, if different from EMAIL_FROM. */
  replyTo?: string;
}): Promise<SendResult> {
  if (!isEmailConfigured()) {
    // Not an error in dev: surface enough to follow the flow by hand. Pull the
    // action link out of the HTML so it's clickable straight from the console.
    const link = opts.html.match(/href="([^"]+)"/)?.[1];
    console.warn(
      `[email] not configured — would send to ${opts.to}: "${opts.subject}"` +
        (link ? `\n[email] link: ${link}` : "") +
        `\n[email] set RESEND_API_KEY + EMAIL_FROM to actually deliver.`,
    );
    return { ok: false, reason: "unconfigured" };
  }
  try {
    const { error } = await getClient().emails.send({
      from: FROM!,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
    });
    if (error) {
      console.error("[email] send failed:", error);
      return { ok: false, reason: "error" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] send threw:", err);
    return { ok: false, reason: "error" };
  }
}
