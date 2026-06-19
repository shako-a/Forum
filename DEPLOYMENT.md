# Deploying GeoGlobally to DigitalOcean

The app ships as a Docker image (Next.js standalone server) on **DigitalOcean
App Platform**, backed by **Managed PostgreSQL**. Future image uploads will use
**Spaces**.

## Architecture

| Piece | DO product | Notes |
|-------|-----------|-------|
| Web app | App Platform service (`web`) | Runs `node server.js` from the standalone build on port `8080` |
| Migrations | App Platform PRE_DEPLOY job (`migrate`) | Runs `prisma migrate deploy` before each new version goes live |
| Database | Managed PostgreSQL (`forum-db`) | Pooled connection for the app; direct connection for migrations |
| Image uploads (future) | Spaces + CDN | See `SPACES_*` in `.env.example` |

## One-time setup

1. **Push the repo to GitHub** (`shako-a/Forum`, branch `main`) — already done.
2. **Create the app** from the spec:
   ```bash
   doctl apps create --spec .do/app.yaml
   ```
   (Or: DO dashboard → Apps → Create → pick the repo → it detects the Dockerfile.)
3. **Set secrets** in the DO dashboard (App → Settings → App-Level Env Vars):
   - `SESSION_SECRET` — generate with `openssl rand -base64 32`, mark as **encrypted**.
   - `DATABASE_URL` is wired automatically from the managed DB via the
     `${forum-db.DATABASE_URL}` binding.
4. **First migration + seed.** The PRE_DEPLOY job runs `prisma migrate deploy`
   automatically. To seed initial data (categories, ad cards, admin), run the
   seed once from your machine against the production DB:
   ```bash
   # Use the DB's DIRECT (non-pooled) connection string from the DO dashboard.
   # Set a real admin so you can log in:
   DATABASE_URL="postgresql://...prod-direct..." \
   SEED_ADMIN_EMAIL="you@example.com" \
   SEED_ADMIN_PASSWORD="a-strong-password" \
   npm run db:seed
   ```

## Routine deploys

`git push origin main` → App Platform rebuilds, runs the `migrate` job, then
rolls out the new `web` version. Nothing else to do.

## Connection pooling (do this before real traffic)

1. DB → **Connection Pools** → create a pool (transaction mode).
2. Point the **web service** `DATABASE_URL` at the **pool** connection string.
3. Keep the **migrate job** `DATABASE_URL` on the **direct** connection
   (`prisma migrate deploy` needs a direct, non-pooled connection).

## Hardening before launch

- Flip the DB to a **production cluster with a standby node** (`production: true`
  in `.do/app.yaml`) for automatic failover.
- Add a **custom domain** + managed TLS (App → Settings → Domains).
- Scale `web` `instance_count` to ≥2 once traffic justifies it.

## Build & run locally with Docker (optional sanity check)

```bash
docker build -t geoglobally .
docker run --rm -p 8080:8080 \
  -e SESSION_SECRET="$(openssl rand -base64 32)" \
  -e DATABASE_URL="postgresql://host.docker.internal:5432/forum" \
  geoglobally
# open http://localhost:8080/en
```
