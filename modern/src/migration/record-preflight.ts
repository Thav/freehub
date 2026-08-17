/**
 * Records the read-only FH-005 preflight result in the canonical migration tables.
 * The candidate importer is intentionally limited to the FH-006 slice: it proves
 * the run, sanitized quarantine accounting and report hash are durable without
 * claiming that the full cutover importer (FH-020) already exists.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const [preflightFile] = process.argv.slice(2);
if (!preflightFile) throw new Error("usage: tsx src/migration/record-preflight.ts PRELIGHT.json");
const bytes = await readFile(preflightFile);
const report = JSON.parse(bytes.toString()) as { contractVersion: number; source: { sha256: string }; tables: Array<{ sourceTable: string; quarantineCategories: Record<string, number> }> };
const db = new PrismaClient();
const run = await db.migrationRun.create({ data: { sourceSha256: report.source.sha256, contractVersion: report.contractVersion } });
for (const table of report.tables) for (const [category, count] of Object.entries(table.quarantineCategories)) if (count > 0) {
  await db.migrationIssue.create({ data: { migrationRunId: run.id, sourceTable: table.sourceTable, sourceId: null, category, disposition: "quarantined", payloadFingerprint: createHash("sha256").update(`${table.sourceTable}:${category}:${count}`).digest("hex"), sanitizedDetail: { count } } });
}
await db.migrationRun.update({ where: { id: run.id }, data: { completedAt: new Date(), reportSha256: createHash("sha256").update(bytes).digest("hex") } });
console.log(`recorded migration run ${run.id} from ${report.source.sha256}`);
await db.$disconnect();
