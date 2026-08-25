import type { Metadata, Viewport } from "next";
import { Sora, Inter, Noto_Sans_Georgian } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { locales, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { SITE_URL } from "@/lib/site";
import { Analytics } from "@/components/Analytics";
import { ConsentBanner } from "@/components/ConsentBanner";
import { GaEventFlash } from "@/components/GaEventFlash";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["600", "700", "800"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const notoGe = Noto_Sans_Georgian({
  variable: "--font-noto-ge",
  subsets: ["georgian"],
  weight: ["400", "500", "600", "700"],
});

// Social scrapers get nothing useful from the page body — the feed is rendered
// per-viewer and there is no hero image to guess at — so the share card has to
// be declared here. `metadataBase` makes the og:image absolute (scrapers reject
// relative ones), and the card itself comes from the colocated
// opengraph-image.tsx / twitter-image.tsx, which Next turns into
// og:image + og:image:width/height automatically.
export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);

  const title = `${dict.common.appName} — ${dict.common.tagline}`;
  const description = dict.common.socialDescription;

  return {
    metadataBase: new URL(SITE_URL),
    applicationName: dict.common.appName,
    title: { default: title, template: `%s · ${dict.common.appName}` },
    description,
    alternates: {
      canonical: `/${lang}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      type: "website",
      siteName: dict.common.appName,
      url: `/${lang}`,
      title,
      description,
      locale: lang === "ka" ? "ka_GE" : "en_US",
      alternateLocale: locales.filter((l) => l !== lang).map((l) => (l === "ka" ? "ka_GE" : "en_US")),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// Lock the layout to the device width. Without this the page can be pinch-zoomed
// out to reveal empty space beside the content; pinning to device-width (with no
// maximum-scale, so zoom stays available for accessibility) keeps the content
// filling the screen. The remaining fix is not letting anything overflow that
// width — see the mobile header rules in globals.css.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Pre-render a static shell for every supported locale.
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <html
      lang={lang}
      className={`${sora.variable} ${inter.variable} ${notoGe.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved/OS theme before first paint. Must stay blocking
            and inline — deferring it reintroduces the light-mode flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Analytics />
        <GaEventFlash />
        <ConsentBanner
          enabled={!!process.env.NEXT_PUBLIC_GA_ID}
          message={dict.consent.message}
          accept={dict.consent.accept}
          decline={dict.consent.decline}
        />
      </body>
    </html>
  );
}
