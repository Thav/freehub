-- Prisma upsert targets declared @unique fields directly; retain these alongside
-- the canonical case-insensitive uniqueness indexes from the baseline migration.
CREATE UNIQUE INDEX "Organization_key_key" ON "Organization"("key");
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
