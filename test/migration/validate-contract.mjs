import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const schema = JSON.parse(await readFile(path.join(root, "docs/modernization/canonical-schema.json")));
const rules = JSON.parse(await readFile(path.join(root, "docs/modernization/migration-rules.json")));
const sql = await readFile(path.join(root, "migration/preflight.sql"), "utf8");

const requiredEntities = [
  "organizations", "users", "organizationMemberships", "people", "visits", "services",
  "tags", "personTags", "notes", "personArchiveEvents", "importJobs", "importRows",
  "migrationRuns", "migrationIssues", "legacyIdentities"
];
const requiredSourceTables = [
  "organizations", "users", "roles", "roles_users", "people", "visits", "services",
  "notes", "tags", "taggings"
];

if (!Number.isInteger(schema.contractVersion) || schema.contractVersion < 1) throw new Error("invalid contractVersion");
if (schema.contractVersion !== rules.contractVersion) throw new Error("schema and rules versions differ");
for (const entity of requiredEntities) {
  if (!schema.entities[entity]) throw new Error(`canonical schema lacks ${entity}`);
  if (!schema.entities[entity].fields?.id) throw new Error(`${entity} lacks an ID contract`);
}
if (schema.database.engine !== "PostgreSQL") throw new Error("canonical engine must remain PostgreSQL");
const schemaText = JSON.stringify(schema);
for (const candidateTerm of ["Prisma", "ActiveRecord", "TypeBox", "Fastify", "Hotwire"]) {
  if (schemaText.includes(candidateTerm)) throw new Error(`candidate-specific schema term: ${candidateTerm}`);
}

if (JSON.stringify(rules.source.tables) !== JSON.stringify(requiredSourceTables)) {
  throw new Error("source table order or coverage differs from the canonical preflight list");
}
if (rules.accounting.equation !== "sourceCount = importCandidates + quarantined") {
  throw new Error("accounting equation changed");
}
for (const table of requiredSourceTables) {
  const categories = rules.accounting.tables[table];
  if (!Array.isArray(categories) || categories.length === 0) throw new Error(`no quarantine rules for ${table}`);
  if (!sql.includes(`'total','${table}'`)) throw new Error(`preflight lacks independent total for ${table}`);
  if (!sql.includes(`'account','${table}'`)) throw new Error(`preflight lacks accounting query for ${table}`);
  for (const category of categories) {
    if (!sql.includes(`'${category}'`)) throw new Error(`preflight lacks ${table}/${category}`);
    const definition = rules.quarantineCategoryDefinitions?.[`${table}.${category}`];
    if (!definition || definition.length < 20) throw new Error(`migration rules lack definition for ${table}.${category}`);
  }
}
const transformationIds = new Set(rules.transformations.map((rule) => rule.id));
if (transformationIds.size !== rules.transformations.length) throw new Error("duplicate transformation ID");
for (const category of rules.reportIssueCategories) {
  if (!sql.includes(`'${category}'`)) throw new Error(`preflight lacks issue query ${category}`);
  const definition = rules.reportIssueCategoryDefinitions?.[category];
  if (!definition || definition.length < 20) throw new Error(`migration rules lack issue definition ${category}`);
}
for (const required of [
  "discard_legacy_credentials", "zero_datetime_to_null", "duplicate_normalized_phone",
  "orphan_audit_user_to_null", "tag_tenant_fanout", "note_polymorphic_target"
]) {
  if (!transformationIds.has(required)) throw new Error(`migration rules lack transformation ${required}`);
}

console.log(`canonical contract valid: ${requiredEntities.length} entities, ${requiredSourceTables.length} source tables, ${rules.transformations.length} transformations`);
