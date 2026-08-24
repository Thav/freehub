-- FH-014: A queue entry can be removed before work begins without deleting its
-- historical audit trail. Cancelled visits are excluded from operational queues.
ALTER TABLE "Visit" ADD COLUMN "cancelledAt" TIMESTAMPTZ, ADD COLUMN "cancelledByUserId" BIGINT REFERENCES "User"("id");
CREATE INDEX "Visit_open_queue_idx" ON "Visit" ("organizationId", "personId", "activity", "arrivedAt") WHERE "endedAt" IS NULL AND "cancelledAt" IS NULL;
