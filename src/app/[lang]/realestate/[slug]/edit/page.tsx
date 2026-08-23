import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { deleteListing } from "@/app/actions/estate";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ListingForm } from "@/components/estate/ListingForm";
import { ConfirmButton } from "@/components/business/ConfirmButton";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }: PageProps<"/[lang]/realestate/[slug]/edit">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const dict = await getDictionary(lang);

  const [allCategories, listing] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.propertyListing.findUnique({ where: { slug } }),
  ]);
  if (!listing) notFound();
  if (listing.ownerId !== user.id && user.role !== "ADMIN") redirect(`/${lang}/realestate/${slug}`);
  const t = dict.estate;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/realestate/${listing.slug}`} className="btn btn-ghost btn-sm biz-back">
            ‹ {listing.title}
          </Link>
          <div className="account-head">
            <h1 className="account-title">{t.editTitle}</h1>
          </div>
          <ListingForm
            locale={lang}
            dict={dict}
            mode="edit"
            values={{
              id: listing.id,
              kind: listing.kind,
              propertyType: listing.propertyType,
              title: listing.title,
              description: listing.description ?? "",
              price: listing.price,
              bedrooms: listing.bedrooms ?? "",
              bathrooms: listing.bathrooms ?? "",
              rooms: listing.rooms ?? "",
              areaSqFt: listing.areaSqFt ?? "",
              yearBuilt: listing.yearBuilt ?? "",
              address: listing.address,
              city: listing.city ?? "",
              state: listing.state,
              contactName: listing.contactName ?? "",
              phone: listing.phone ?? "",
              email: listing.email ?? "",
              features: listing.features,
              photos: listing.photos,
              active: listing.active,
            }}
          />

          <div className="card card-pad biz-danger">
            <h2 className="biz-section-title">{t.dangerTitle}</h2>
            <p className="account-sub">{t.dangerSub}</p>
            <ConfirmButton
              action={deleteListing.bind(null, listing.id, lang)}
              label={`🗑 ${t.deleteListing}`}
              confirmText={t.confirmDelete}
              className="btn btn-danger"
            />
          </div>
        </main>
      </div>
    </>
  );
}
