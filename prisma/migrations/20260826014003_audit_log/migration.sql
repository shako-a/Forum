-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorRole" TEXT,
    "actingAsId" TEXT,
    "action" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "outcome" TEXT NOT NULL DEFAULT 'ok',
    "model" TEXT,
    "targetId" TEXT,
    "targetLabel" TEXT,
    "summary" TEXT NOT NULL,
    "changes" JSONB,
    "snapshot" JSONB,
    "meta" JSONB,
    "ip" TEXT,
    "country" TEXT,
    "userAgent" TEXT,
    "path" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_at_idx" ON "AuditLog"("actorId", "at");

-- CreateIndex
CREATE INDEX "AuditLog_model_targetId_at_idx" ON "AuditLog"("model", "targetId", "at");

-- CreateIndex
CREATE INDEX "AuditLog_action_at_idx" ON "AuditLog"("action", "at");

-- CreateIndex
CREATE INDEX "AuditLog_severity_at_idx" ON "AuditLog"("severity", "at");

-- CreateIndex
CREATE INDEX "AuditLog_ip_at_idx" ON "AuditLog"("ip", "at");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Append-only guard. The app's database role can add audit rows but never
-- rewrite or remove them, so an entry can't be quietly edited after the fact.
-- The single permitted update is nulling actorId, which the User foreign key's
-- ON DELETE SET NULL performs when an account row is removed.
CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'AuditLog is append-only';
  END IF;
  IF (to_jsonb(NEW) - 'actorId') IS DISTINCT FROM (to_jsonb(OLD) - 'actorId') THEN
    RAISE EXCEPTION 'AuditLog is append-only';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
