-- FH-010: opaque database-backed sessions and account lifecycle controls.
-- Existing spike sessions are revoked: their old cookie values were database IDs,
-- rather than purpose-generated secrets, so they must not survive this upgrade.
ALTER TABLE "User" ADD COLUMN "disabledAt" TIMESTAMPTZ;
ALTER TABLE "Session" ADD COLUMN "tokenDigest" CHAR(64), ADD COLUMN "csrfTokenDigest" CHAR(64), ADD COLUMN "revokedAt" TIMESTAMPTZ;
UPDATE "Session" SET "revokedAt" = CURRENT_TIMESTAMP WHERE "revokedAt" IS NULL;
UPDATE "Session" SET "tokenDigest" = lpad("id", 64, '0') WHERE "tokenDigest" IS NULL;
ALTER TABLE "Session" ALTER COLUMN "tokenDigest" SET NOT NULL;
CREATE UNIQUE INDEX "Session_tokenDigest_key" ON "Session"("tokenDigest");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
