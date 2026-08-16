import { readFile } from "node:fs/promises";
import process from "node:process";

if (process.argv.length !== 4) {
  throw new Error("usage: node test/migration/reconcile.mjs PREFLIGHT.json LEDGER.json");
}

const [preflight, ledger] = await Promise.all(
  process.argv.slice(2).map(async (file) => JSON.parse(await readFile(file)))
);
if (preflight.contractVersion !== ledger.contractVersion) throw new Error("contract versions differ");
if (preflight.source.sha256 !== ledger.sourceSha256) throw new Error("source hashes differ");
if (ledger.schemaVersion !== 1 || !Array.isArray(ledger.tables)) throw new Error("invalid reconciliation ledger");

const ledgerTables = new Map(ledger.tables.map((table) => [table.sourceTable, table]));
if (ledgerTables.size !== ledger.tables.length) throw new Error("duplicate reconciliation table");

let sourceRows = 0;
let importedSourceRows = 0;
let quarantinedSourceRows = 0;
let legacyIdentityMappings = 0;
for (const expected of preflight.tables) {
  const actual = ledgerTables.get(expected.sourceTable);
  if (!actual) throw new Error(`ledger lacks ${expected.sourceTable}`);
  for (const field of ["importedSourceRows", "quarantinedSourceRows", "legacyIdentityMappings"]) {
    if (!Number.isSafeInteger(actual[field]) || actual[field] < 0) throw new Error(`${expected.sourceTable}.${field} is invalid`);
  }
  if (actual.importedSourceRows !== expected.importCandidates) throw new Error(`${expected.sourceTable} imported count differs from preflight`);
  if (actual.quarantinedSourceRows !== expected.quarantined) throw new Error(`${expected.sourceTable} quarantine count differs from preflight`);
  const actualCategories = actual.quarantineCategories || {};
  for (const category of Object.keys(actualCategories)) {
    if (!Object.hasOwn(expected.quarantineCategories, category)) throw new Error(`${expected.sourceTable} has unexpected quarantine category ${category}`);
  }
  for (const [category, count] of Object.entries(expected.quarantineCategories)) {
    if ((actualCategories[category] || 0) !== count) throw new Error(`${expected.sourceTable}/${category} differs from preflight`);
  }
  if (actual.importedSourceRows > 0 && actual.legacyIdentityMappings < actual.importedSourceRows) {
    throw new Error(`${expected.sourceTable} lacks an identity mapping for every imported source row`);
  }
  if (actual.importedSourceRows + actual.quarantinedSourceRows !== expected.sourceCount) {
    throw new Error(`${expected.sourceTable} does not reconcile to its source count`);
  }
  sourceRows += expected.sourceCount;
  importedSourceRows += actual.importedSourceRows;
  quarantinedSourceRows += actual.quarantinedSourceRows;
  legacyIdentityMappings += actual.legacyIdentityMappings;
  ledgerTables.delete(expected.sourceTable);
}
if (ledgerTables.size) throw new Error(`unexpected reconciliation tables: ${[...ledgerTables.keys()].join(", ")}`);
if (sourceRows !== importedSourceRows + quarantinedSourceRows) throw new Error("ledger summary accounting failed");

const summary = {
  sourceRows,
  importedSourceRows,
  quarantinedSourceRows,
  legacyIdentityMappings,
  reconciliationPass: true
};
if (JSON.stringify(summary) !== JSON.stringify(ledger.summary)) throw new Error("ledger summary differs from calculated values");
console.log(`reconciliation valid: ${sourceRows} source = ${importedSourceRows} imported + ${quarantinedSourceRows} quarantined; ${legacyIdentityMappings} identity mappings`);
