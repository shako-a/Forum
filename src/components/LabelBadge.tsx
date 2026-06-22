import { labelName } from "@/i18n/localize";
import type { Locale } from "@/i18n/config";

// The fields needed to render a label badge (subset of the Label model).
export type BadgeLabel = {
  nameEn: string;
  nameKa: string;
  color: string;
  background: string;
  font: string;
  bold: boolean;
};

// Renders one admin-defined label as a styled badge. Styling is per-label
// (dynamic colors/font), so it's applied inline over a shared base class.
export function LabelBadge({ label, locale }: { label: BadgeLabel; locale: Locale }) {
  return (
    <span
      className="label-badge"
      style={{
        color: label.color,
        background: label.background,
        fontFamily: label.font === "display" ? "var(--font-display)" : "var(--font-body)",
        fontWeight: label.bold ? 700 : 500,
      }}
    >
      {labelName(label, locale)}
    </span>
  );
}
