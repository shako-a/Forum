import type { Metadata, Viewport } from "next";
import { Sora, Inter, Noto_Sans_Georgian } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { locales, isLocale } from "@/i18n/config";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { Analytics } from "@/components/Analytics";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["600", "700", "800"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const notoGe = Noto_Sans_Georgian({
  variable: "--font-noto-ge",
  subsets: ["georgian"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GeoGlobally",
  description: "A community forum for Georgians, worldwide.",
};

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
      </body>
    </html>
  );
}
