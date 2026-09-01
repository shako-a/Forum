import Link from "@/components/Link";
import type { Locale } from "@/i18n/config";

// Logo + wordmark shown at the top of auth cards.
export function AuthBrand({ locale, appName }: { locale: Locale; appName: string }) {
  return (
    <Link className="auth-brand" href={`/${locale}`} aria-label={`${appName} home`}>
      <span className="logo-mark" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 4v16M4 12h16" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
          <path
            d="M6 6.5h2M16 6.5h2M6 17.5h2M16 17.5h2"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity=".85"
          />
        </svg>
      </span>
      <span className="logo-text">
        Geo<span className="ge">Globally</span>
      </span>
    </Link>
  );
}
