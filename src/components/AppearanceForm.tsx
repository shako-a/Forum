"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { updateAppearance } from "@/app/actions/appearance";
import {
  PALETTES,
  CUSTOM_PALETTE,
  DENSITIES,
  RADII,
  DEPTHS,
  appearanceCss,
  type AppearancePrefs,
} from "@/lib/appearance";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

// Appearance settings. Everything here is self-only — it changes what this
// user sees and is never shown to anyone else — so there is nothing to
// moderate and no public surface.
export function AppearanceForm({
  locale,
  dict,
  prefs,
  canCustomize,
}: {
  locale: Locale;
  dict: Dictionary;
  prefs: AppearancePrefs;
  /** Supporter (or above). Non-holders see the controls disabled + an upsell. */
  canCustomize: boolean;
}) {
  const t = dict.appearance;
  // Dictionary types are inferred literally from en.json, so widen the
  // label maps to plain records for keyed lookups.
  const names = (m: Record<string, string>) => m;
  const palettes = names(t.palettes);
  const [state, action, pending] = useActionState(updateAppearance, undefined);

  const [palette, setPalette] = useState(prefs.themePalette);
  const [accent, setAccent] = useState(prefs.themeAccent ?? PALETTES[0].accent);
  const [density, setDensity] = useState(prefs.themeDensity);
  const [radius, setRadius] = useState(prefs.themeRadius);
  const [depth, setDepth] = useState(prefs.themeDepth);

  const draft: AppearancePrefs = {
    themePalette: palette,
    themeAccent: accent,
    themeDensity: density,
    themeRadius: radius,
    themeDepth: depth,
  };

  // Live preview: the same CSS the server would emit, applied to the whole
  // page while editing. Because it uses the identical generator, what you see
  // here is exactly what you get after saving.
  useEffect(() => {
    if (!canCustomize) return;
    const el = document.createElement("style");
    el.id = "appearance-preview";
    el.textContent = appearanceCss(draft);
    document.head.appendChild(el);
    return () => el.remove();
  }, [palette, accent, density, radius, depth, canCustomize]);

  const fieldset = (label: string, options: readonly string[], value: string, set: (v: string) => void, names: Record<string, string>) => (
    <div className="field">
      <span className="appearance-label">{label}</span>
      <div className="choice-row" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            disabled={!canCustomize}
            className={`choice${value === o ? " active" : ""}`}
            onClick={() => set(o)}
          >
            {names[o]}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="card card-pad appearance-card">
      <div className="appearance-head">
        <h2 className="account-title">{t.title}</h2>
        <p className="account-sub">{t.subtitle}</p>
      </div>

      {!canCustomize && (
        <p className="appearance-upsell">
          🤍 {t.supporterOnly}{" "}
          <Link href={`/${locale}/more`}>{t.seePackages}</Link>
        </p>
      )}

      <form action={action} className="appearance-form">
        <input type="hidden" name="themePalette" value={palette} />
        <input type="hidden" name="themeDensity" value={density} />
        <input type="hidden" name="themeRadius" value={radius} />
        <input type="hidden" name="themeDepth" value={depth} />
        {palette === CUSTOM_PALETTE && <input type="hidden" name="themeAccent" value={accent} />}

        <div className="field">
          <span className="appearance-label">{t.accent}</span>
          <div className="swatch-row" role="radiogroup" aria-label={t.accent}>
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={palette === p.id}
                aria-label={palettes[p.id] ?? p.id}
                title={palettes[p.id] ?? p.id}
                disabled={!canCustomize}
                className={`swatch${palette === p.id ? " active" : ""}`}
                style={{ background: p.accent }}
                onClick={() => setPalette(p.id)}
              />
            ))}
            {/* Custom colour. The saved value is clamped for contrast on both
                light and dark before it ever reaches the page, so no choice
                here can produce unreadable text. */}
            <label
              className={`swatch swatch-custom${palette === CUSTOM_PALETTE ? " active" : ""}`}
              style={{ background: accent }}
              title={t.custom}
            >
              <input
                type="color"
                value={accent}
                disabled={!canCustomize}
                onChange={(e) => {
                  setAccent(e.target.value);
                  setPalette(CUSTOM_PALETTE);
                }}
              />
            </label>
          </div>
          <span className="field-hint">{t.contrastNote}</span>
        </div>

        {fieldset(t.density, DENSITIES, density, setDensity, names(t.densities))}
        {fieldset(t.radius, RADII, radius, setRadius, names(t.radii))}
        {fieldset(t.depth, DEPTHS, depth, setDepth, names(t.depths))}

        {state?.message && !state.ok && <p className="field-error">{state.message}</p>}
        {state?.ok && <p className="auth-ok">{t.saved}</p>}

        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={pending || !canCustomize}>
            {dict.common.save}
          </button>
        </div>
      </form>
    </div>
  );
}
