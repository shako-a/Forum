import type { Metadata } from "next";
import { Sora, Inter, Noto_Sans_Georgian } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { locales, isLocale } from "@/i18n/config";

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
    >
      <body>
        {/* Signature dual-flag ribbon (Georgia + US) */}
        <div className="flag-ribbon" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
