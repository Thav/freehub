import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../..");
const schemaPath = path.join(root, "docs/modernization/canonical-schema.json");
const rulesPath = path.join(root, "docs/modernization/migration-rules.json");
const sqlPath = path.join(root, "migration/preflight.sql");

const options = {
  service: "db",
  database: "freehub_legacy",
  label: "legacy-source",
  sourceSha256: null
};

for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index];
  const value = process.argv[index + 1];
  if (!value) throw new Error(`missing value for ${flag}`);
  if (flag === "--service") options.service = value;
  else if (flag === "--database") options.database = value;
  else if (flag === "--label") options.label = value;
  else if (flag === "--source-sha256") options.sourceSha256 = value;
  else throw new Error(`unknown argument: ${flag}`);
}

for (const [name, value] of [["service", options.service], ["database", options.database], ["label", options.label]]) {
  if (!/^[A-Za-z0-9_.-]+$/.test(value)) throw new Error(`${name} contains unsupported characters`);
}
if (!/^[a-f0-9]{64}$/.test(options.sourceSha256 || "")) {
  throw new Error("--source-sha256 must be a lowercase SHA-256 value");
}

const [schemaBytes, rulesBytes, sqlBytes] = await Promise.all([
  readFile(schemaPath),
  readFile(rulesPath),
  readFile(sqlPath)
]);
const schema = JSON.parse(schemaBytes);
const rules = JSON.parse(rulesBytes);
const sql = sqlBytes.toString("utf8");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const executableSql = sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");
for (const statement of executableSql.split(";").map((part) => part.trim()).filter(Boolean)) {
  if (!/^(SELECT|WITH)\b/i.test(statement)) throw new Error("preflight SQL must contain only SELECT or WITH statements");
}

const databaseUser = process.env.PREFLIGHT_DB_USER || "freehub";
const databasePassword = process.env.PREFLIGHT_DB_PASSWORD || "freehub";
const readOnlySql = `SET SESSION TRANSACTION READ ONLY;\nSTART TRANSACTION READ ONLY;\n${sql}\nCOMMIT;\n`;
const command = spawnSync("docker", [
  "compose", "exec", "-T", options.service,
  "mariadb", "--batch", "--raw", "--skip-column-names",
  `--user=${databaseUser}`, `--password=${databasePassword}`, options.database
], {
  cwd: root,
  input: readOnlySql,
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024
});
if (command.error) throw command.error;
if (command.status !== 0) {
  process.stderr.write(command.stderr);
  throw new Error(`MariaDB preflight exited ${command.status}`);
}

const tableConfig = rules.accounting.tables;
const tables = new Map(Object.entries(tableConfig).map(([name, categories]) => [name, {
  sourceTable: name,
  sourceCount: null,
  importCandidates: 0,
  quarantined: 0,
  accountingPass: false,
  quarantineCategories: Object.fromEntries(categories.map((category) => [category, 0]))
}]));
const issues = new Map();

for (const line of command.stdout.split(/\r?\n/).filter(Boolean)) {
  const fields = line.split("\t");
  if (fields.length !== 5) throw new Error(`unexpected preflight output: ${line}`);
  const [recordType, sourceTable, disposition, category, countText] = fields;
  const count = Number(countText);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error(`invalid count in preflight output: ${line}`);
  if (recordType === "total" && disposition === "source" && category === "source_count") {
    const table = tables.get(sourceTable);
    if (!table) throw new Error(`SQL returned unconfigured source table: ${sourceTable}`);
    if (table.sourceCount !== null) throw new Error(`duplicate source total: ${sourceTable}`);
    table.sourceCount = count;
  } else if (recordType === "account") {
    const table = tables.get(sourceTable);
    if (!table) throw new Error(`SQL returned unconfigured source table: ${sourceTable}`);
    if (category === "import_candidate" && disposition === "candidate") table.importCandidates += count;
    else if (disposition === "quarantine" && Object.hasOwn(table.quarantineCategories, category)) {
      table.quarantineCategories[category] += count;
    } else throw new Error(`SQL returned unconfigured accounting category: ${line}`);
  } else if (recordType === "issue" && disposition === "warning") {
    if (!rules.reportIssueCategories.includes(category)) throw new Error(`SQL returned unconfigured issue category: ${category}`);
    const key = `${sourceTable}\u0000${category}`;
    if (issues.has(key)) throw new Error(`duplicate issue output: ${sourceTable}/${category}`);
    issues.set(key, { sourceTable, category, count });
  } else throw new Error(`unexpected preflight record: ${line}`);
}

for (const table of tables.values()) {
  table.quarantined = Object.values(table.quarantineCategories).reduce((sum, count) => sum + count, 0);
  if (table.sourceCount === null) throw new Error(`missing source total: ${table.sourceTable}`);
  table.accountingPass = table.sourceCount === table.importCandidates + table.quarantined;
}
for (const category of rules.reportIssueCategories) {
  if (![...issues.values()].some((issue) => issue.category === category)) {
    throw new Error(`SQL does not emit configured issue category: ${category}`);
  }
}

const tableList = [...tables.values()];
const report = {
  schemaVersion: 1,
  contractVersion: schema.contractVersion,
  source: {
    label: options.label,
    sha256: options.sourceSha256,
    engine: rules.source.engine,
    database: options.database,
    readOnlyTransaction: true
  },
  contract: {
    canonicalSchemaSha256: sha256(schemaBytes),
    migrationRulesSha256: sha256(rulesBytes),
    preflightSqlSha256: sha256(sqlBytes)
  },
  summary: {
    sourceRows: tableList.reduce((sum, table) => sum + table.sourceCount, 0),
    importCandidates: tableList.reduce((sum, table) => sum + table.importCandidates, 0),
    quarantined: tableList.reduce((sum, table) => sum + table.quarantined, 0),
    accountingPass: tableList.every((table) => table.accountingPass)
  },
  tables: tableList,
  issues: [...issues.values()].sort((left, right) =>
    left.sourceTable.localeCompare(right.sourceTable) || left.category.localeCompare(right.category)
  )
};

if (!report.summary.accountingPass) throw new Error("source accounting failed");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
