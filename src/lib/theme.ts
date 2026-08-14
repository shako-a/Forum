// Theme is stored client-side only: the cookie exists so the choice survives
// reloads, and the inline script in layout.tsx applies it before first paint.
// Nothing on the server reads it, which keeps the locale layout statically
// renderable (see generateStaticParams there).
export const THEME_COOKIE = "theme";

// Runs as a blocking inline <script> in <head>, before any paint. Resolves the
// theme in priority order — explicit cookie choice, then OS preference — and
// stamps it on <html> so the very first frame is already correct (no white
// flash for dark-mode users). Kept tiny and dependency-free on purpose; it is
// stringified into the document.
export const THEME_INIT_SCRIPT = `
(function(){try{
var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=(dark|light)/);
var t=m?m[1]:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
document.documentElement.dataset.theme=t;
}catch(e){document.documentElement.dataset.theme='light';}})();
`.trim();
