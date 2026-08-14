import { appearanceCss, isCustomized, type AppearancePrefs } from "@/lib/appearance";

/**
 * Emits the signed-in user's appearance preferences as design-token overrides.
 *
 * Rendered from <Header>, which every user-facing page already renders with
 * the user loaded — so there is no extra query, no cookie, and (because the
 * markup is server-rendered with the rest of the page) no first-paint flash to
 * correct on the client. The admin panel deliberately doesn't include Header,
 * so it keeps its own fixed styling.
 *
 * Nothing is emitted for guests or for users still on the defaults, which
 * keeps the common case byte-for-byte identical to before.
 */
export function UserTheme({ prefs }: { prefs: AppearancePrefs | null }) {
  if (!prefs || !isCustomized(prefs)) return null;
  // Values are enum/hex-validated in appearanceCss before being inlined.
  return <style dangerouslySetInnerHTML={{ __html: appearanceCss(prefs) }} />;
}
