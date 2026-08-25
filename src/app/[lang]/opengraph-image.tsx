import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { defaultLocale, isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { SITE_HOST } from "@/lib/site";

// The card Facebook, X, Telegram, WhatsApp and Slack show when someone pastes a
// geoglobally.com link. One per locale, so a link shared in a Georgian group
// previews in Georgian.
//
// Design notes:
//  - Dark navy, not the site's light paper. A light card disappears into
//    Facebook's white feed; the navy block with the red mark stops the scroll.
//  - No emoji anywhere. `ImageResponse` can only draw emoji by fetching images
//    from a CDN at render time, which would put a network call in the
//    production build. Section labels use plain coloured dots instead.
//  - Fonts are read from `public/fonts` rather than a root `assets/` dir: the
//    Dockerfile copies `public/` into the runner image but not `assets/`, so
//    this keeps working even if the route ever renders outside the build.

export const alt = "GeoGlobally — the Georgian community forum";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Bake both cards at build time. Nothing here touches the database, so this
// keeps the "no DATABASE_URL needed for the build" property the Dockerfile
// relies on — and a scraper then gets a static PNG instead of making a 1vCPU
// instance rasterize one on demand.
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

const font = (name: string) => readFile(join(process.cwd(), "public", "fonts", name));

// Brand palette, in the dark-theme variants (see globals.css). The exact
// light-theme red is kept for the mark itself so the logo stays the logo.
const MARK_RED = "#d7263d";
const RED = "#ff5a70";
const WHITE = "#f4f7fd";
const MUTED = "#9fb0cb";

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);

  const [soraExtraBold, soraBold, geoBold, geoRegular] = await Promise.all([
    font("Sora-ExtraBold.ttf"),
    font("Sora-Bold.ttf"),
    font("NotoSansGeorgian-Bold.ttf"),
    font("NotoSansGeorgian-Regular.ttf"),
  ]);

  // The four listing sections, in the order they appear in the sidebar.
  const sections: { label: string; dot: string }[] = [
    { label: dict.nav.jobs, dot: RED },
    { label: dict.nav.realEstate, dot: "#6ea8ff" },
    { label: dict.nav.market, dot: "#4ade80" },
    { label: dict.nav.auto, dot: "#e0b95e" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          backgroundColor: "#0a0f1c",
          // Kept to two stops: resvg renders a visible band at an intermediate
          // colour stop on a diagonal gradient this large.
          backgroundImage: "linear-gradient(125deg, #0a0f1c 0%, #22345a 100%)",
          fontFamily: "Sora",
        }}
      >
        {/* Warm glow behind the mark, so the top-left doesn't read as flat navy.
            The box has to fit inside the 630px canvas: satori clamps an
            oversized absolutely-positioned child to the parent's height, which
            chops the fade off mid-gradient and leaves a visible horizontal
            edge. At 620px tall the gradient reaches full transparency well
            before the box ends, so there's nothing to see. */}
        <div
          style={{
            position: "absolute",
            top: -160,
            left: -150,
            width: 620,
            height: 620,
            borderRadius: 620,
            backgroundImage: "radial-gradient(circle, rgba(215,38,61,0.40) 0%, rgba(215,38,61,0) 68%)",
          }}
        />

        {/* The red-to-navy stripe from the homepage welcome card. */}
        <div
          style={{
            width: "100%",
            height: 12,
            backgroundImage: `linear-gradient(90deg, ${MARK_RED} 0%, #7a2a67 52%, #1f4e9c 100%)`,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "52px 72px 46px" }}>
          {/* Mark + wordmark */}
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <svg width="92" height="92" viewBox="0 0 512 512">
              <rect width="512" height="512" rx="136" fill={MARK_RED} />
              <g transform="translate(106,106) scale(12.5)" stroke="#ffffff" strokeLinecap="round" fill="none">
                <path d="M12 4v16M4 12h16" strokeWidth="3.4" />
                <path d="M6 6.5h2M16 6.5h2M6 17.5h2M16 17.5h2" strokeWidth="1.6" opacity="0.85" />
              </g>
            </svg>
            <div style={{ display: "flex", marginLeft: 26, fontSize: 58, fontWeight: 800, letterSpacing: -1.5 }}>
              <span style={{ color: WHITE }}>Geo</span>
              <span style={{ color: RED }}>Globally</span>
            </div>
          </div>

          {/* Headline — the brand tagline, in the viewer's language.
              `flexShrink: 0` matters here: satori shrinks flex children to fit
              rather than overflowing, so without it the longer Georgian text
              squashes these boxes and the lines draw on top of each other. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              width: 1056,
              marginTop: 36,
              fontFamily: "Noto Sans Georgian",
              fontWeight: 700,
              fontSize: 72,
              lineHeight: 1.18,
              // Only the Latin setting wants negative tracking; Georgian
              // letterforms need their default spacing to stay legible.
              letterSpacing: locale === "ka" ? 0 : -2,
              color: WHITE,
            }}
          >
            {dict.common.tagline}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              width: 900,
              marginTop: 20,
              fontFamily: "Noto Sans Georgian",
              fontWeight: 400,
              fontSize: 26,
              lineHeight: 1.45,
              color: MUTED,
            }}
          >
            {dict.common.socialSubline}
          </div>

          {/* Section chips */}
          <div style={{ display: "flex", marginTop: "auto", flexShrink: 0, flexWrap: "wrap" }}>
            {sections.map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginRight: 14,
                  marginTop: 12,
                  padding: "12px 22px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ width: 11, height: 11, borderRadius: 11, backgroundColor: s.dot, marginRight: 11 }} />
                <div
                  style={{
                    fontFamily: "Noto Sans Georgian",
                    fontWeight: 700,
                    fontSize: 25,
                    color: "#dbe4f2",
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              marginTop: 32,
              paddingTop: 24,
              borderTop: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 700, color: WHITE }}>{SITE_HOST}</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Sora", data: soraExtraBold, style: "normal", weight: 800 },
        { name: "Sora", data: soraBold, style: "normal", weight: 700 },
        { name: "Noto Sans Georgian", data: geoBold, style: "normal", weight: 700 },
        { name: "Noto Sans Georgian", data: geoRegular, style: "normal", weight: 400 },
      ],
    },
  );
}
