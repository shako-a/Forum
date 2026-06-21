import { PrismaPg } from "@prisma/adapter-pg";

// Builds the Prisma `pg` driver adapter with SSL handling for managed Postgres.
//
// Managed providers (e.g. DigitalOcean) serve a cert signed by their own private
// CA that isn't in Node's trust store. Prisma 7's pg adapter treats
// `sslmode=require` as verify-full, so it rejects that cert with
// "Error opening a TLS connection: self-signed certificate in certificate chain".
//
// For any SSL connection we therefore strip `sslmode` from the URL (so it can't
// force verify-full) and configure TLS explicitly to encrypt without strict CA
// verification — the app↔DB traffic stays inside the provider's network. Local
// development has no `sslmode`, so the connection string is used unchanged.
export function createPgAdapter(): PrismaPg {
  const raw = process.env.DATABASE_URL;
  if (raw) {
    try {
      const url = new URL(raw);
      const mode = url.searchParams.get("sslmode");
      if (mode && mode !== "disable") {
        url.searchParams.delete("sslmode");
        url.searchParams.delete("uselibpqcompat");
        return new PrismaPg({
          connectionString: url.toString(),
          ssl: { rejectUnauthorized: false },
        });
      }
    } catch {
      // Not a parseable URL — fall through and let pg handle the raw string.
    }
  }
  return new PrismaPg({ connectionString: raw });
}
