import Link from "@/components/Link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { canRenew, isMarketExpired } from "@/lib/market";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { MarketListingForm } from "@/components/market/MarketListingForm";
import { OwnerControls } from "@/components/market/OwnerControls";

export const dynamic = "force-dynamic";

export default async function EditMarketListingPage({ params }: PageProps<"/[lang]/market/[slug]/edit">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const [dict, allCategories, listing] = await Promise.all([
    getDictionary(lang),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.marketListing.findUnique({ where: { slug } }),
  ]);
  if (!listing) notFound();
  if (listing.sellerId !== user.id && user.role !== "ADMIN") redirect(`/${lang}/market/${slug}`);
  const t = dict.market;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/market/${listing.slug}`} className="btn btn-ghost btn-sm biz-back">‹ {listing.title}</Link>
          <div className="account-head">
            <h1 className="account-title">{t.editTitle}</h1>
          </div>

          <div className="card card-pad mk-owner-card">
            <OwnerControls
              locale={lang}
              dict={dict}
              listingId={listing.id}
              slug={listing.slug}
              status={listing.status}
              renewable={canRenew(listing.bumpedAt)}
              expired={isMarketExpired(listing.bumpedAt)}
            />
          </div>

          <MarketListingForm
            locale={lang}
            dict={dict}
            mode="edit"
            values={{
              id: listing.id,
              title: listing.title,
              description: listing.description,
              category: listing.category,
              condition: listing.condition,
              priceType: listing.priceType,
              price: listing.price,
              city: listing.city ?? "",
              zip: listing.zip ?? "",
              state: listing.state,
              localPickup: listing.localPickup,
              localDelivery: listing.localDelivery,
              canShip: listing.canShip,
              phone: listing.phone ?? "",
              photos: listing.photos,
            }}
          />
        </main>
      </div>
    </>
  );
}
