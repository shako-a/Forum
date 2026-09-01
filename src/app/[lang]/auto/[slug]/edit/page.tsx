import Link from "@/components/Link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { AutoListingForm } from "@/components/auto/AutoListingForm";
import { AutoOwnerControls } from "@/components/auto/AutoOwnerControls";

export const dynamic = "force-dynamic";

export default async function EditAutoListingPage({ params }: PageProps<"/[lang]/auto/[slug]/edit">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const [dict, allCategories, l] = await Promise.all([
    getDictionary(lang),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.autoListing.findUnique({ where: { slug } }),
  ]);
  if (!l) notFound();
  if (l.ownerId !== user.id && user.role !== "ADMIN") redirect(`/${lang}/auto/${slug}`);
  const t = dict.auto;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/auto/${l.slug}`} className="btn btn-ghost btn-sm biz-back">‹ {l.title}</Link>
          <div className="account-head"><h1 className="account-title">{t.editTitle}</h1></div>
          {l.status !== "REMOVED" && (
            <div className="card card-pad mk-owner-card">
              <AutoOwnerControls locale={lang} dict={dict} listingId={l.id} slug={l.slug} kind={l.kind} status={l.status} />
            </div>
          )}
          <AutoListingForm
            locale={lang}
            dict={dict}
            mode="edit"
            values={{
              id: l.id,
              kind: l.kind,
              year: l.year,
              make: l.make,
              makeOther: l.makeOther ?? "",
              model: l.model,
              bodyType: l.bodyType ?? "",
              mileage: l.mileage ?? "",
              transmission: l.transmission ?? "",
              fuel: l.fuel ?? "",
              drivetrain: l.drivetrain ?? "",
              color: l.color ?? "",
              condition: l.condition,
              vin: l.vin ?? "",
              price: l.price,
              negotiable: l.negotiable,
              insured: l.insured,
              minRentalDays: l.minRentalDays ?? "",
              depositAmount: l.depositAmount ?? "",
              description: l.description ?? "",
              features: l.features,
              photos: l.photos,
              city: l.city ?? "",
              zip: l.zip ?? "",
              state: l.state,
              contactName: l.contactName ?? "",
              phone: l.phone ?? "",
              email: l.email ?? "",
            }}
          />
        </main>
      </div>
    </>
  );
}
