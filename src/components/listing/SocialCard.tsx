import { Section } from "@/components/listing/Section";
import { TrackedLink } from "@/components/listing/TrackedLink";
import type { SocialLink } from "@/lib/business-social";
import type { ContactTarget } from "@/lib/modules";

export function SocialCard({ title, target, links }: { title: string; target: ContactTarget; links: SocialLink[] }) {
  if (links.length === 0) return null;
  return (
    <Section title={title}>
      <div className="social-links">
        {links.map((l) => (
          <TrackedLink key={l.key} target={target} kind="social" href={l.href} external title={l.label} className={`social-link social-${l.key}`}>
            <span aria-hidden="true">{l.icon}</span>
            <span className="social-name">{l.label}</span>
          </TrackedLink>
        ))}
      </div>
    </Section>
  );
}
