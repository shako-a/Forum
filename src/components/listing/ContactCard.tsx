import { Section } from "@/components/listing/Section";
import { TrackedLink } from "@/components/listing/TrackedLink";
import type { ContactTarget, InteractionKind } from "@/lib/modules";

export type ContactRow = {
  icon: string;
  label: string;
  value: React.ReactNode;
  href?: string;
  kind?: InteractionKind;
  external?: boolean;
};

// The rail's Contact card: one row per channel, each a tracked link.
export function ContactCard({ title, target, rows }: { title: string; target: ContactTarget; rows: ContactRow[] }) {
  const shown = rows.filter((r) => r.value);
  if (shown.length === 0) return null;
  return (
    <Section title={title}>
      <ul className="contact-rows">
        {shown.map((r, i) => (
          <li key={i} className="contact-row">
            <span className="contact-label">
              <span aria-hidden="true">{r.icon}</span> {r.label}
            </span>
            {r.href && r.kind ? (
              <TrackedLink target={target} kind={r.kind} href={r.href} external={r.external} className="contact-value">
                {r.value}
              </TrackedLink>
            ) : r.href ? (
              <a href={r.href} className="contact-value">{r.value}</a>
            ) : (
              <span className="contact-value contact-static">{r.value}</span>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}
