"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  setPackageActive,
  deletePackage,
  movePackage,
  createFeature,
  updateFeature,
  setFeatureActive,
  deleteFeature,
  moveFeature,
} from "@/app/actions/admin-packages";
import { formatPrice } from "@/lib/tiers";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type AdminPackage = {
  id: string;
  key: string;
  slug: string;
  isBuiltIn: boolean;
  name: string;
  icon: string;
  accent: string;
  priceCents: number;
  effectiveCents: number;
  isActive: boolean;
  featured: boolean;
  perkCount: number;
  holders: number;
  discountState: "live" | "scheduled" | "ended" | null;
  percentOff: number;
  discountEndsAt: string | null;
};

export type AdminFeature = {
  id: string;
  key: string;
  nameEn: string;
  nameKa: string;
  isActive: boolean;
  usedBy: number;
};

function FieldError({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="field-error">{msgs[0]}</p>;
}

// --- one package row --------------------------------------------------------

function PackageRow({
  pkg,
  locale,
  dict,
  first,
  last,
}: {
  pkg: AdminPackage;
  locale: Locale;
  dict: Dictionary;
  first: boolean;
  last: boolean;
}) {
  const t = dict.admin.pkg;
  const [pending, startTransition] = useTransition();
  const discounted = pkg.effectiveCents !== pkg.priceCents;

  return (
    <tr className={pkg.isActive ? undefined : "row-off"}>
      <td>
        <div className="pkg-cell">
          <span className="pkg-dot" style={{ background: pkg.accent }} aria-hidden="true" />
          <span aria-hidden="true">{pkg.icon}</span>
          <div>
            <Link href={`/${locale}/admin/more/${pkg.id}`} className="pkg-name">
              {pkg.name}
            </Link>
            <div className="muted-sm">
              /more/{pkg.slug}
              {pkg.isBuiltIn && <span className="pkg-tag">{t.builtIn}</span>}
              {pkg.featured && <span className="pkg-tag">★</span>}
            </div>
          </div>
        </div>
      </td>

      <td>
        {discounted ? (
          <>
            <s className="muted-sm">{formatPrice(pkg.priceCents)}</s>{" "}
            <strong>{formatPrice(pkg.effectiveCents)}</strong>
          </>
        ) : (
          <strong>{formatPrice(pkg.priceCents)}</strong>
        )}
      </td>

      <td>
        {pkg.discountState === "live" && (
          <span className="pill pill-live">
            −{pkg.percentOff}% · {t.discountLive}
          </span>
        )}
        {pkg.discountState === "scheduled" && <span className="pill">{t.discountScheduled}</span>}
        {pkg.discountState === "ended" && <span className="pill pill-off">{t.discountEnded}</span>}
        {pkg.discountState === null && <span className="muted-sm">—</span>}
      </td>

      <td>{pkg.perkCount}</td>
      <td>{pkg.holders}</td>

      <td>
        <button
          type="button"
          className="action"
          disabled={pending}
          title={t.activeHint}
          onClick={() => startTransition(() => void setPackageActive(pkg.id, !pkg.isActive))}
        >
          {pkg.isActive ? "✓ " + t.active : "— " + t.inactive}
        </button>
      </td>

      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        <button
          type="button"
          className="action"
          disabled={pending || first}
          title={t.moveUp}
          onClick={() => startTransition(() => void movePackage(pkg.id, "up"))}
        >
          ↑
        </button>
        <button
          type="button"
          className="action"
          disabled={pending || last}
          title={t.moveDown}
          onClick={() => startTransition(() => void movePackage(pkg.id, "down"))}
        >
          ↓
        </button>
        <Link href={`/${locale}/admin/more/${pkg.id}`} className="action">
          ✎
        </Link>
        {/* Built-ins back the Donor/Pro/Supporter flags, so they deactivate
            rather than delete — the button is absent, not just disabled. */}
        {!pkg.isBuiltIn && (
          <button
            type="button"
            className="action mod-action"
            disabled={pending}
            title={t.deletePackage}
            onClick={() => {
              if (!confirm(t.deleteConfirm)) return;
              startTransition(() => void deletePackage(pkg.id));
            }}
          >
            ✕
          </button>
        )}
      </td>
    </tr>
  );
}

// --- perk catalogue ---------------------------------------------------------

function FeatureRow({
  feature,
  dict,
  first,
  last,
}: {
  feature: AdminFeature;
  dict: Dictionary;
  first: boolean;
  last: boolean;
}) {
  const t = dict.admin.pkg;
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, action, saving] = useActionState(updateFeature, undefined);

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (editing) {
    return (
      <tr>
        <td colSpan={5}>
          <form action={action} className="feature-form">
            <input type="hidden" name="id" value={feature.id} />
            <label className="field">
              <span>{t.featureNameEn}</span>
              <input name="nameEn" defaultValue={feature.nameEn} className="input" required />
              <FieldError msgs={state?.errors?.nameEn} />
            </label>
            <label className="field">
              <span>{t.featureNameKa}</span>
              <input name="nameKa" defaultValue={feature.nameKa} className="input" required />
              <FieldError msgs={state?.errors?.nameKa} />
            </label>
            <label className="admin-check">
              <input type="checkbox" name="isActive" defaultChecked={feature.isActive} />
              {t.active}
            </label>
            <div className="admin-form-actions">
              <button className="btn btn-primary" disabled={saving}>
                {dict.common.save}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                {dict.common.cancel}
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className={feature.isActive ? undefined : "row-off"}>
      <td>{feature.nameEn}</td>
      <td>{feature.nameKa}</td>
      <td>
        <code className="muted-sm">{feature.key}</code>
      </td>
      <td>{feature.usedBy}</td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        {/* Catalogue order is what the public cards use, so these arrows
            control public presentation, not just this table. */}
        <button
          type="button"
          className="action"
          disabled={pending || first}
          title={t.moveUp}
          onClick={() => startTransition(() => void moveFeature(feature.id, "up"))}
        >
          ↑
        </button>
        <button
          type="button"
          className="action"
          disabled={pending || last}
          title={t.moveDown}
          onClick={() => startTransition(() => void moveFeature(feature.id, "down"))}
        >
          ↓
        </button>
        <button
          type="button"
          className="action"
          disabled={pending}
          onClick={() => startTransition(() => void setFeatureActive(feature.id, !feature.isActive))}
        >
          {feature.isActive ? "✓ " + t.active : "— " + t.inactive}
        </button>
        <button type="button" className="action" onClick={() => setEditing(true)}>
          ✎
        </button>
        <button
          type="button"
          className="action mod-action"
          disabled={pending}
          onClick={() => {
            if (!confirm(t.deleteFeatureConfirm)) return;
            startTransition(() => void deleteFeature(feature.id));
          }}
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

function NewFeatureForm({ dict }: { dict: Dictionary }) {
  const t = dict.admin.pkg;
  const [state, action, pending] = useActionState(createFeature, undefined);
  const [nonce, setNonce] = useState(0);

  // Remount the fields after a successful create so the form clears.
  useEffect(() => {
    if (state?.ok) setNonce((n) => n + 1);
  }, [state]);

  return (
    <form action={action} className="feature-form" key={nonce}>
      <label className="field">
        <span>{t.featureNameEn}</span>
        <input name="nameEn" className="input" required />
        <FieldError msgs={state?.errors?.nameEn} />
      </label>
      <label className="field">
        <span>{t.featureNameKa}</span>
        <input name="nameKa" className="input" required />
        <FieldError msgs={state?.errors?.nameKa} />
      </label>
      <label className="field">
        <span>{t.featureKey}</span>
        <input name="key" className="input" placeholder="askAi" />
        <span className="field-hint">{t.featureKeyHint}</span>
        <FieldError msgs={state?.errors?.key} />
      </label>
      <input type="hidden" name="isActive" value="on" />
      <div className="admin-form-actions">
        <button className="btn btn-primary" disabled={pending}>
          {t.newFeature}
        </button>
      </div>
    </form>
  );
}

// --- page -------------------------------------------------------------------

export function PackageAdmin({
  locale,
  dict,
  packages,
  features,
}: {
  locale: Locale;
  dict: Dictionary;
  packages: AdminPackage[];
  features: AdminFeature[];
}) {
  const t = dict.admin.pkg;

  return (
    <>
      <div className="admin-head flex items-center justify-between gap-4">
        <div>
          <h1 className="admin-h1">{t.title}</h1>
          <p className="admin-sub">{t.subtitle}</p>
        </div>
        <Link href={`/${locale}/admin/more/new`} className="btn btn-primary">
          + {t.newPackage}
        </Link>
      </div>

      <section className="admin-section">
        <h2 className="admin-section-title">{t.packages}</h2>
        {packages.length === 0 ? (
          <p className="muted-sm">{t.noPackages}</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t.packages}</th>
                  <th>{t.price}</th>
                  <th>{t.discount}</th>
                  <th>{t.perks}</th>
                  <th>{t.holders}</th>
                  <th>{t.active}</th>
                  <th style={{ textAlign: "right" }}>{dict.admin.actions}</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((p, i) => (
                  <PackageRow
                    key={p.id}
                    pkg={p}
                    locale={locale}
                    dict={dict}
                    first={i === 0}
                    last={i === packages.length - 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">{t.features}</h2>
        {features.length === 0 ? (
          <p className="muted-sm">{t.noFeatures}</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t.featureNameEn}</th>
                  <th>{t.featureNameKa}</th>
                  <th>{t.featureKey}</th>
                  <th>{t.packages}</th>
                  <th style={{ textAlign: "right" }}>{dict.admin.actions}</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => (
                  <FeatureRow
                    key={f.id}
                    feature={f}
                    dict={dict}
                    first={i === 0}
                    last={i === features.length - 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <NewFeatureForm dict={dict} />
      </section>
    </>
  );
}
