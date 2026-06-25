"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import {
  US_STATES,
  GEORGIA_VALUE,
  GEORGIA_FLAG,
  USA_VALUE,
  USA_FLAG,
  georgiaName,
  usaName,
  isKnownUsState,
} from "@/lib/us-states";

// State picker: the country Georgia (with flag) plus all US states. When the
// field starts empty and `geolocate` is on, it best-effort pre-selects from the
// visitor's IP (US region → state, Georgia → GE). Purely a convenience default;
// silently does nothing if the lookup fails.
export function StateSelect({
  name = "state",
  label,
  locale,
  required = true,
  defaultValue = "",
  usGroupLabel,
  error,
  geolocate = false,
}: {
  name?: string;
  label: string;
  locale: Locale;
  required?: boolean;
  defaultValue?: string;
  usGroupLabel: string;
  error?: string[];
  geolocate?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (!geolocate || value) return;
    const controller = new AbortController();
    fetch("https://ipapi.co/json/", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if (d.country_code === "GE") setValue(GEORGIA_VALUE);
        else if (d.country_code === "US") {
          // Prefer the specific state; fall back to country-level US.
          setValue(isKnownUsState(d.region_code) ? d.region_code : USA_VALUE);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [geolocate, value]);

  // Preserve a legacy free-text value that isn't one of the known options.
  const isLegacy =
    !!value && value !== GEORGIA_VALUE && value !== USA_VALUE && !isKnownUsState(value);

  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required && <span className="req">*</span>}
      </label>
      <select
        id={name}
        name={name}
        className="input"
        required={required}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={error ? true : undefined}
      >
        <option value="" disabled>
          —
        </option>
        {isLegacy && <option value={value}>{value}</option>}
        <option value={GEORGIA_VALUE}>
          {GEORGIA_FLAG} {georgiaName(locale)}
        </option>
        <option value={USA_VALUE}>
          {USA_FLAG} {usaName(locale)}
        </option>
        <optgroup label={usGroupLabel}>
          {US_STATES.map((s) => (
            <option key={s.abbr} value={s.abbr}>
              {s.name} ({s.abbr})
            </option>
          ))}
        </optgroup>
      </select>
      {error && <span className="field-error">{error.join(" ")}</span>}
    </div>
  );
}
