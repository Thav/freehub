import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Target = { screen?: string; evidence: "capture" | "behavior" | "replacement"; decision?: string };
const target = (screen: string): Target => ({ screen, evidence: "capture" });
const targets: Record<string, Target> = {
  "auth-login": target("login"),
  "auth-login-error": target("login-error"),
  "auth-forgot": { screen: "login", evidence: "replacement", decision: "Administrator-issued temporary-password guidance replaces retired email-token recovery." },
  "organization-home": target("home"),
  "organization-settings": target("settings"),
  "organization-empty-home": target("empty-home"),
  "authorization-denied": { evidence: "behavior", decision: "Cross-tenant denial is covered by browser and integration tests." },
  "people-search-results": target("search"),
  "people-new": target("people-new"),
  "people-validation": target("people-validation"),
  "person-current-member": target("profile-current"),
  "person-expired-member": target("profile-expired"),
  "person-patron": target("profile-patron"),
  "person-staff": target("profile-staff"),
  "person-edit": target("person-edit"),
  "person-tags-edit": target("person-tags"),
  "tag-people": target("tag-people"),
  "tag-pagination": target("tag-pagination"),
  "visits-today": target("visits-today"),
  "visits-historical": target("visits-historical"),
  "visits-empty": target("visits-empty"),
  "visits-index": target("visits-index"),
  "visit-detail": target("visit-detail"),
  "visit-new": target("visit-new"),
  "visit-edit": target("visit-edit"),
  "services-index": target("services-index"),
  "service-detail": target("service-detail"),
  "service-new": target("service-new"),
  "service-edit": target("service-edit"),
  "notes-index": target("notes-index"),
  "note-detail": target("note-detail"),
  "note-new": target("note-new"),
  "note-edit": target("note-edit"),
  "reports-index": target("reports-index"),
  "report-people": target("report-people"),
  "report-people-empty": target("report-people-empty"),
  "report-services": target("report-services"),
  "report-services-empty": target("report-services-empty"),
  "report-visits": target("report-visits"),
  "report-visits-empty": target("report-visits-empty"),
  "report-summary": target("report-summary"),
  "report-summary-empty-error": { screen: "report-summary-empty", evidence: "replacement", decision: "A valid empty summary replaces the approved legacy server-error evidence." },
  "user-profile": target("account"),
  "user-edit": target("account"),
  "csv-people": { evidence: "behavior", decision: "Integration coverage verifies filtered, all-result CSV headers and filenames." },
  "csv-services": { evidence: "behavior", decision: "Integration coverage verifies filtered, all-result CSV headers and filenames." },
  "csv-visits": { evidence: "behavior", decision: "Integration coverage verifies filtered, all-result CSV headers and filenames." },
  "workflow-person-create": target("workflow-person-create"),
  "workflow-visit-queue": target("workflow-visit-queue"),
  "workflow-visit-sign-in": target("workflow-visit-sign-in"),
  "workflow-visit-sign-out": target("workflow-visit-sign-out")
};

const baselinePath = process.env.PARITY_BASELINE_MANIFEST || path.resolve("../test/legacy-visual/manifest.json");
const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as { captures: { id: string; kind?: string }[] };

test("the modern evidence map accounts for every retained FH-004 entry", () => {
  expect(Object.keys(targets).sort()).toEqual(baseline.captures.map(({ id }) => id).sort());
  for (const capture of baseline.captures) {
    const modern = targets[capture.id];
    expect(modern.evidence).toBe(capture.kind === "download" || capture.kind === "probe" ? "behavior" : modern.evidence);
    if (!modern.screen) expect(modern.decision).toBeTruthy();
  }
});

type Fixture = { organizationId: string; emptyOrganizationId: string; fixtureTagId: string; paginationTagId: string; today: string };
async function login(page: Page): Promise<Fixture> {
  await page.goto("/");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Add a person to the queue" })).toBeVisible();
  const organizations = await page.evaluate(async () => (await fetch("/api/organizations")).json() as Promise<{ id: string; key: string }[]>);
  const organizationId = organizations.find(({ key }) => key === "spike-shop")!.id;
  const emptyOrganizationId = organizations.find(({ key }) => key === "empty-shop")!.id;
  const tags = await page.evaluate(async (id) => (await fetch(`/api/organizations/${id}/tags`)).json() as Promise<{ id: string; name: string }[]>, organizationId);
  const person = await page.evaluate(async (id) => (await fetch(`/api/organizations/${id}/people/900003`)).json() as Promise<{ today: string }>, organizationId);
  return { organizationId, emptyOrganizationId, fixtureTagId: tags.find(({ name }) => name === "fixture tag")!.id, paginationTagId: tags.find(({ name }) => name === "fixture pagination")!.id, today: person.today };
}

const relativeDay = (day: string, offset: number) => { const value = new Date(`${day}T12:00:00.000Z`); value.setUTCDate(value.getUTCDate() + offset); return value.toISOString().slice(0, 10); };
async function openScreen(page: Page, screen: string) {
  if (screen === "login") { await page.goto("/"); return; }
  if (screen === "login-error") { await page.goto("/"); await page.getByLabel("Password").fill("incorrect-password"); await page.getByRole("button", { name: "Log in" }).click(); await expect(page.getByText("Log in failed")).toBeVisible(); return; }
  const fixture = await login(page); const org = fixture.organizationId; const empty = fixture.emptyOrganizationId; const today = fixture.today;
  if (screen === "workflow-person-create") {
    await page.goto(`/organizations/${org}/people/new`);
    await page.getByLabel("First").fill("Capture");
    await page.getByLabel("Last").fill("Created");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("capture.created@fixtures.invalid");
    await page.getByRole("button", { name: "Create person" }).click();
    await expect(page.getByRole("status")).toHaveText("Person was successfully created.");
    await expect(page.getByRole("heading", { name: "Capture Created" })).toBeVisible();
    return;
  }
  if (screen === "workflow-visit-queue") {
    await page.route("**/visits", async (route) => {
      const payload = JSON.parse(route.request().postData() || "{}") as Record<string, unknown>;
      await route.continue({ postData: JSON.stringify({ ...payload, arrivedAt: `${today}T08:30:00.000Z` }) });
    });
    await page.goto(`/organizations/${org}/people/900003`);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByRole("status")).toHaveText("Visit for Patron NoService was successfully created.");
    await expect(page.getByRole("row").filter({ hasText: "Patron NoService" }).getByRole("button", { name: "Sign In" })).toBeVisible();
    return;
  }
  if (screen === "workflow-visit-sign-in" || screen === "workflow-visit-sign-out") {
    const action = screen === "workflow-visit-sign-in" ? "sign-in" : "sign-out";
    const at = `${today}T${action === "sign-in" ? "09:15" : "11:45"}:00.000Z`;
    await page.route(`**/${action}`, async (route) => route.continue({ postData: JSON.stringify({ at }), headers: { ...route.request().headers(), "content-type": "application/json" } }));
    await page.goto(`/organizations/${org}/visits/days/${today}`);
    const row = page.getByRole("row").filter({ hasText: "Patron NoService" });
    await row.getByRole("button", { name: action === "sign-in" ? "Sign In" : "Sign Out" }).click();
    await expect(page.getByRole("status")).toHaveText(`Patron NoService was successfully ${action === "sign-in" ? "signed in" : "signed out"}.`);
    if (action === "sign-in") await expect(row.getByRole("button", { name: "Sign Out" })).toBeVisible();
    return;
  }
  const routes: Record<string, string> = {
    home: `/organizations/${org}`, settings: `/organizations/${org}/settings`, "empty-home": `/organizations/${empty}`,
    "people-new": `/organizations/${org}/people/new`, "people-validation": `/organizations/${org}/people/new`, "profile-current": `/organizations/${org}/people/900001`, "profile-expired": `/organizations/${org}/people/900002`, "profile-patron": `/organizations/${org}/people/900003`, "profile-staff": `/organizations/${org}/people/900004`, "person-edit": `/organizations/${org}/people/900001/edit`, "person-tags": `/organizations/${org}/people/900001/tags`,
    "tag-people": `/organizations/${org}/tags/${fixture.fixtureTagId}`, "tag-pagination": `/organizations/${org}/tags/${fixture.paginationTagId}?page=2`,
    "visits-today": `/organizations/${org}/visits/days/${today}`, "visits-historical": `/organizations/${org}/visits/days/${relativeDay(today, -1)}`, "visits-empty": `/organizations/${empty}/visits/days/${today}`,
    "visits-index": `/organizations/${org}/people/900004/visits`, "visit-detail": `/organizations/${org}/people/900004/visits/900002`, "visit-new": `/organizations/${org}/people/900001/visits/new`, "visit-edit": `/organizations/${org}/people/900004/visits/900002/edit`,
    "services-index": `/organizations/${org}/people/900001/services`, "service-detail": `/organizations/${org}/people/900004/services/900003`, "service-new": `/organizations/${org}/people/900001/services/new`, "service-edit": `/organizations/${org}/people/900004/services/900003/edit`,
    "notes-index": `/organizations/${org}/people/900004/notes`, "note-detail": `/organizations/${org}/people/900001/notes/900001`, "note-new": `/organizations/${org}/people/900001/notes/new`, "note-edit": `/organizations/${org}/people/900001/notes/900001/edit`,
    "reports-index": `/organizations/${org}/reports`, "report-people": `/organizations/${org}/reports`, "report-people-empty": `/organizations/${empty}/reports`, "report-services": `/organizations/${org}/reports`, "report-services-empty": `/organizations/${empty}/reports`, "report-visits": `/organizations/${org}/reports`, "report-visits-empty": `/organizations/${empty}/reports`, "report-summary": `/organizations/${org}/reports`, "report-summary-empty": `/organizations/${empty}/reports`, account: `/organizations/${org}/account`
  };
  await page.goto(routes[screen] || `/organizations/${org}`);
  if (screen === "search") await page.getByLabel("Search people").fill("Ada");
  if (screen === "people-validation") await page.getByRole("button", { name: "Create person" }).click();
  const reportKind = screen.match(/^report-(people|services|visits|summary)/)?.[1];
  if (reportKind) {
    await page.getByRole("tab", { name: reportKind[0].toUpperCase() + reportKind.slice(1) }).click();
    if (reportKind !== "summary") await page.getByRole("button", { name: "Update report" }).click();
  }
  await expect(page.locator("main")).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test("capture deterministic modern candidates for every retained screenshot", async ({ page }) => {
  const output = process.env.PARITY_OUTPUT;
  test.skip(!output, "Set PARITY_OUTPUT to generate ignored owner-review candidates.");
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await mkdir(path.join(output!, "screenshots"), { recursive: true });
  const results = baseline.captures.filter(({ kind }) => kind === "download" || kind === "probe").map((legacy) => ({ id: legacy.id, modernScreen: null, evidence: targets[legacy.id].evidence, decision: targets[legacy.id].decision, finalPath: null, bytes: null, sha256: null }));
  for (const legacy of baseline.captures.filter(({ kind }) => !kind || kind === "screenshot")) {
    const modern = targets[legacy.id];
    await openScreen(page, modern.screen!);
    const bytes = await page.screenshot({ path: path.join(output!, "screenshots", `${legacy.id}.png`), fullPage: true, animations: "disabled" });
    results.push({ id: legacy.id, modernScreen: modern.screen, evidence: modern.evidence, decision: modern.decision || null, finalPath: new URL(page.url()).pathname, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  await writeFile(path.join(output!, "evidence.json"), `${JSON.stringify({ schemaVersion: 1, viewport: { width: 1280, height: 900 }, results }, null, 2)}\n`);
});
