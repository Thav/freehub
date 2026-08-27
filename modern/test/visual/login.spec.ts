import { test, expect } from "@playwright/test";

const loginManager = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Add a person to the queue" })).toBeVisible();
  const match = page.url().match(/\/organizations\/(\d+)/);
  expect(match).toBeTruthy();
  return match![1];
};

test("protected pages return anonymous visitors to login before rendering a form", async ({ page }) => {
  await page.goto("/organizations/1/people/new");
  await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create person" })).toHaveCount(0);
});

test("tag suggestions include case-insensitive matches already assigned to a person", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Login").fill("manager");
  await page.getByLabel("Password").fill("spike-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByLabel("Search people").fill("Ada");
  await page.getByRole("link", { name: "Ada Rider" }).click();
  await page.getByRole("link", { name: "Tags" }).click();
  await page.getByLabel("Tags").fill("co");
  await expect(page.getByRole("list", { name: "Tag suggestions" }).getByRole("button", { name: "Community", exact: true })).toBeVisible();
});

test("login, scoped search, and profile navigation work from one origin", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
  await expect(page.getByText("Welcome to Freehub")).toBeVisible();
  await expect(page.getByText(/EngineYard/i)).toHaveCount(0);
  await page.getByLabel("Login").fill("manager");
  await page.getByLabel("Password").fill("spike-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Add a person to the queue" })).toBeVisible();
  await expect(page.getByText("Spike Bike Shop", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByText("Hello").getByRole("link", { name: "manager" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
  const shell = await page.locator("main").boundingBox();
  expect(shell?.width).toBe(960);
  await expect(page.locator(".site-header")).toHaveCSS("background-color", "rgb(106, 106, 106)");
  await expect(page.locator("footer")).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(page.getByRole("link", { name: "Ada Rider" })).toHaveCount(0);
  await page.getByLabel("Search people").fill("at");
  const searchRows = page.locator("main > ul > li");
  await expect(searchRows.nth(1)).toBeVisible();
  await expect(searchRows.first()).toHaveCSS("background-color", "rgb(221, 255, 255)");
  await expect(searchRows.nth(1)).toHaveCSS("background-color", "rgb(242, 255, 255)");
  await page.getByLabel("Search people").fill("Ada");
  await expect(page.getByRole("link", { name: "Ada Rider" })).toBeVisible();
  await page.getByRole("link", { name: "Ada Rider" }).click();
  await expect(page.getByRole("heading", { name: "Ada Rider" })).toBeVisible();
  await expect(page.getByLabel("Project")).toBeChecked();
  await expect(page.getByLabel("Volunteer")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("familiar navigation remains available at a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("manager settings retain the legacy organization terminology", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Login").fill("manager");
  await page.getByLabel("Password").fill("spike-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Spike Bike Shop : Settings" })).toBeVisible();
  await expect(page.getByLabel("Organization Name")).toBeVisible();
  await expect(page.getByLabel("Key")).toHaveValue("spike-shop");
  await expect(page.getByLabel("Location")).toBeVisible();
  await expect(page.getByLabel("Timezone")).toHaveValue("America/Chicago");
  await page.getByRole("button", { name: "Update" }).click();
  await expect(page.getByRole("status")).toHaveText("Organization was successfully updated.");
  await expect(page.getByLabel("Timezone")).toBeVisible();
  await expect(page.getByText("You do not have permission to change organization settings.")).toHaveCount(0);
});

test("people can be created, archived, and restored", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Login").fill("manager");
  await page.getByLabel("Password").fill("spike-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: "New person" }).click();
  await page.getByLabel("First").fill("Playwright");
  await page.getByLabel("Last").fill("Rider");
  await page.getByLabel("Year of birth").fill("1985");
  await expect(page.getByLabel("Address line 2")).toBeVisible();
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("playwright.rider@example.test");
  await page.getByRole("button", { name: "Create person" }).click();
  await expect(page.getByRole("status")).toHaveText("Person was successfully created.");
  await expect(page.getByRole("heading", { name: "Playwright Rider" })).toBeVisible();
  await page.getByRole("link", { name: "Edit Playwright" }).click();
  await expect(page.getByLabel("Year of birth")).toHaveValue("1985");
  await page.getByLabel("Phone number").fill("503-555-0123");
  await page.getByRole("button", { name: "Update person" }).click();
  await expect(page.getByRole("status")).toHaveText("Person was successfully updated.");
  await expect(page.getByText("503-555-0123")).toBeVisible();
  await page.getByRole("button", { name: "Archive person" }).click();
  await expect(page.getByRole("status")).toHaveText("Person was successfully archived.");
  await expect(page.getByText("This person is archived.")).toBeVisible();
  await page.getByRole("button", { name: "Restore person" }).click();
  await expect(page.getByRole("status")).toHaveText("Person was successfully restored.");
  await expect(page.getByRole("button", { name: "Archive person" })).toBeVisible();
});

test("person tags can be assigned and notes can be added", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Login").fill("manager");
  await page.getByLabel("Password").fill("spike-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: "New person" }).click();
  await page.getByLabel("First").fill("Tag Note");
  await page.getByLabel("Last").fill("Rider");
  await page.getByRole("button", { name: "Create person" }).click();
  await page.getByRole("link", { name: "Tags" }).click();
  await page.getByLabel("Tags").fill("Visual tag");
  await page.getByRole("button", { name: "Save tags" }).click();
  await expect(page.getByRole("status")).toHaveText("Tags saved.");
  await expect(page.getByLabel("Tags")).toHaveValue("");
  await expect(page.getByRole("link", { name: "Visual tag" })).toBeVisible();
  await page.getByRole("link", { name: "Home" }).click();
  await page.getByRole("link", { name: "New person" }).click();
  await page.getByLabel("First").fill("Suggestion");
  await page.getByLabel("Last").fill("Rider");
  await page.getByRole("button", { name: "Create person" }).click();
  await page.getByRole("link", { name: "Tags" }).click();
  await page.getByLabel("Tags").fill("visual");
  await expect(page.getByRole("button", { name: "Visual tag" })).toBeVisible();
  await page.getByRole("button", { name: "Visual tag" }).click();
  await expect(page.getByLabel("Tags")).toHaveValue("Visual tag, ");
  await page.goBack();
  await page.getByRole("link", { name: "Notes" }).click();
  await page.getByRole("link", { name: "Add a note" }).click();
  await page.getByLabel("Text").fill("Visual note");
  await page.getByRole("button", { name: "Create note" }).click();
  await expect(page.getByRole("status")).toHaveText("Note was successfully created.");
  await expect(page.getByText("Visual note")).toBeVisible();
});

test("daily visits support quick sign-in, queue transitions, and visit detail", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Login").fill("manager");
  await page.getByLabel("Password").fill("spike-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: "New person" }).click();
  await page.getByLabel("First").fill("Visit Queue");
  await page.getByLabel("Last").fill(`Rider ${Date.now()}`);
  await page.getByRole("button", { name: "Create person" }).click();
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("status")).toContainText("Visit for Visit Queue Rider");
  await expect(page.getByRole("status")).toContainText("was successfully created.");
  await expect(page.getByRole("heading", { name: "In the Shop Today" })).toBeVisible();
  await page.getByRole("link", { name: "Show" }).last().click();
  await expect(page.getByRole("heading", { name: /Visits : Detail/ })).toBeVisible();
});

test("daily project and volunteering tables share column positions", async ({ page }) => {
  await loginManager(page);
  await page.getByRole("link", { name: "Visits" }).click();
  const tables = page.locator(".visit-day table");
  await expect(tables).toHaveCount(2);
  const projectHeaders = tables.first().locator("th");
  const volunteeringHeaders = tables.nth(1).locator("th");
  for (let index = 0; index < 6; index += 1) {
    const projectBox = await projectHeaders.nth(index).boundingBox();
    const volunteeringBox = await volunteeringHeaders.nth(index).boundingBox();
    expect(volunteeringBox?.x).toBeCloseTo(projectBox!.x, 1);
    expect(volunteeringBox?.width).toBeCloseTo(projectBox!.width, 1);
  }
});

test("daily visit clocks follow organization timezone changes", async ({ page }) => {
  const organizationId = await loginManager(page);
  const setTimezone = async (timezone: string) => {
    await page.goto(`/organizations/${organizationId}/settings`);
    await page.getByLabel("Timezone").selectOption(timezone);
    await page.getByRole("button", { name: "Update" }).click();
    await expect(page.getByRole("status")).toHaveText("Organization was successfully updated.");
  };
  await setTimezone("America/Chicago");
  await page.getByRole("link", { name: "Visits" }).click();
  const visitDayPath = new URL(page.url()).pathname;
  await expect(page.getByRole("row", { name: /Expired Member/ }).locator("td").nth(1)).toHaveText("8:30 AM");
  await setTimezone("UTC");
  await page.goto(visitDayPath);
  await expect(page.getByRole("row", { name: /Expired Member/ }).locator("td").nth(1)).toHaveText("1:30 PM");
  await setTimezone("America/Chicago");
});

test("services can be created, reviewed, and renewed from a profile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: "New person" }).click();
  await page.getByLabel("First").fill("Service Visual");
  await page.getByLabel("Last").fill("Rider");
  await page.getByRole("button", { name: "Create person" }).click();
  await page.getByRole("link", { name: "See All 0 Services with Details" }).click();
  await page.getByRole("link", { name: "Add a service" }).click();
  await page.getByLabel("Service type").selectOption("membership");
  await page.getByRole("button", { name: "Create service" }).click();
  await expect(page.getByRole("status")).toHaveText("Service was successfully created.");
  await expect(page.getByRole("heading", { name: /Services : Detail/ })).toBeVisible();
  await expect(page.locator(".detail-list dt")).toHaveText(["Service type", "Start date", "End date", "Paid", "Volunteered", "Note", "Created", "Updated"]);
  await page.getByRole("link", { name: "Edit service" }).click();
  await page.getByRole("button", { name: "Update service" }).click();
  await expect(page.getByRole("status")).toHaveText("Service was successfully updated.");
  await page.getByRole("link", { name: "Service Visual Rider" }).click();
  await expect(page.getByText(/Membership expires/)).toBeVisible();
  await page.getByRole("button", { name: "Renew" }).click();
  await expect(page.getByRole("status")).toHaveText("Service was successfully renewed.");
  await expect(page.getByText(/Membership expires/)).toBeVisible();
});

test("reports provide populated, empty, and export states", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: "Reports" }).click();
  await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
  await expect(page.getByText(/People Report lists people/)).toBeVisible();
  await expect(page.getByText(/Summary Report provides/)).toBeVisible();
  await page.getByLabel("Date From").fill("2020-01-01");
  await page.getByRole("tab", { name: "Services" }).click();
  await expect(page.getByLabel("Date From")).toHaveValue("2020-01-01");
  await page.getByRole("tab", { name: "People" }).click();
  await page.getByRole("button", { name: "Update report" }).click();
  await expect(page.getByRole("heading", { name: "People", exact: true }).last()).toBeVisible();
  await expect(page.getByRole("link", { name: "Export all" })).toBeVisible();
  await page.getByLabel("Matching name").fill("No such person");
  await page.getByRole("button", { name: "Update report" }).click();
  await expect(page.getByText("No people for date range.")).toBeVisible();
  await page.getByRole("tab", { name: "Summary" }).click();
  await expect(page.getByRole("heading", { name: "Visits by Day" })).toBeVisible();
});

test("manager can preview and confirm a CSV import", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: "Import" }).click();
  await expect(page.getByRole("heading", { name: "Import people" })).toBeVisible();
  const suffix = Date.now();
  await page.getByLabel("CSV file").setInputFiles({ name: "members.csv", mimeType: "text/csv", buffer: Buffer.from(`first_name,last_name,email\nVisual,Import-${suffix},visual.import.${suffix}@example.test\n`) });
  await page.getByRole("button", { name: "Preview import" }).click();
  await expect(page.getByText(/1 to create/)).toBeVisible();
  await expect(page.getByText(`Visual Import-${suffix}`, { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.getByRole("status")).toHaveText(/Import applied/);
  await expect(page.getByRole("link", { name: "View created person" })).toBeVisible();
});

test("manager can preview a bulk people selection", async ({ page }) => {
  await page.goto("/"); await page.getByRole("button", { name: "Log in" }).click(); await page.getByRole("link", { name: "Manage people" }).click();
  await expect(page.getByRole("heading", { name: "Manage people" })).toBeVisible(); await page.getByRole("button", { name: "Preview selection" }).click(); await expect(page.getByRole("heading", { name: /people selected/ })).toBeVisible(); await expect(page.getByRole("link", { name: "Export selection" })).toBeVisible();
});

test("login recovery and person validation retain familiar prominent guidance", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Forgot username or password?" })).toBeVisible();
  await page.getByLabel("Password").fill("incorrect-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert")).toContainText("Log in failed");
  await page.getByLabel("Password").fill("spike-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: "New person" }).click();
  await page.getByRole("button", { name: "Create person" }).click();
  await expect(page.getByRole("alert")).toContainText("There were problems with the following fields");
  await expect(page.getByRole("alert")).toContainText("First name can't be blank");
});

test("all four retained profile states expose the dashboard summaries", async ({ page }) => {
  const organizationId = await loginManager(page);
  for (const [personId, name, status] of [["900001", "Ada Rider", /Membership expires/], ["900002", "Expired Member", /Membership expired/], ["900003", "Patron NoService", /Not a member/], ["900004", "Staff Volunteer", /Staff/]] as const) {
    await page.goto(`/organizations/${organizationId}/people/${personId}`);
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText(status).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent Visits", exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent Services", exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent Notes", exact: false })).toBeVisible();
  }
  await expect(page.getByLabel("Volunteer")).toBeChecked();
});

test("notes have retained index, focused create, detail, and edit states", async ({ page }) => {
  const organizationId = await loginManager(page);
  await page.goto(`/organizations/${organizationId}/people/900001/notes`);
  await expect(page.getByRole("columnheader", { name: "Regarding" })).toBeVisible();
  const seededNote = page.getByRole("row", { name: /Synthetic person note/ });
  await expect(seededNote).toBeVisible();
  await expect(seededNote.getByRole("cell", { name: "Spike Manager" })).toBeVisible();
  await page.getByRole("link", { name: "Add a note" }).click();
  await expect(page.getByRole("heading", { name: /Notes : New/ })).toBeVisible();
  await page.getByLabel("Text").fill("Visual parity note");
  await page.getByRole("button", { name: "Create note" }).click();
  await expect(page.getByRole("status")).toHaveText("Note was successfully created.");
  await expect(page.locator(".detail-list dt", { hasText: "Notable" })).toBeVisible();
  await expect(page.getByText("Visual parity note")).toBeVisible();
  await page.getByRole("link", { name: "Edit note" }).click();
  await expect(page.getByText("Regarding:")).toBeVisible();
  await expect(page.getByLabel("Text")).toHaveValue("Visual parity note");
  await page.getByLabel("Text").fill("Updated visual parity note");
  await page.getByRole("button", { name: "Update note" }).click();
  await expect(page.getByRole("status")).toHaveText("Note was successfully updated.");
});

test("visit and service histories retain labeled columns and correction actions", async ({ page }) => {
  const organizationId = await loginManager(page);
  await page.goto(`/organizations/${organizationId}/people/900004/visits`);
  await expect(page.locator("thead th")).toHaveText(["Arrived", "Signed In", "Signed Out", "Activity", "Hours", "Note", "Actions"]);
  await expect(page.getByRole("link", { name: "Show" })).toBeVisible();
  await page.goto(`/organizations/${organizationId}/people/900004/visits/900002`);
  await expect(page.locator(".detail-list dt")).toHaveText(["Activity", "Datetime arrived", "Signed in", "Signed out", "Duration", "Role snapshot", "Note", "Created", "Updated"]);
  await page.goto(`/organizations/${organizationId}/people/900001/services`);
  await expect(page.locator("thead th")).toHaveText(["Service type", "Start date", "End date", "Paid", "Volunteered", "Note", "Actions"]);
});

test("tag context and deterministic second-page navigation are retained", async ({ page }) => {
  const organizationId = await loginManager(page);
  const tags = await page.evaluate(async (id) => (await fetch(`/api/organizations/${id}/tags`)).json() as Promise<{ id: string; name: string }[]>, organizationId);
  const tagId = tags.find(({ name }) => name === "fixture pagination")!.id;
  await page.goto(`/organizations/${organizationId}/tags/${tagId}?page=2`);
  await expect(page.getByRole("heading", { name: "Tag : fixture pagination" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Membership ends" })).toBeVisible();
  await expect(page.getByText("More:")).toBeVisible();
  await expect(page.getByRole("link", { name: "Pagination 21" })).toBeVisible();
});

test("account and shared screen families remain usable at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const organizationId = await loginManager(page);
  for (const route of [`/organizations/${organizationId}/account`, `/organizations/${organizationId}/people/900001`, `/organizations/${organizationId}/people/900004/visits`, `/organizations/${organizationId}/people/900001/services`, `/organizations/${organizationId}/reports`, `/organizations/${organizationId}/imports`, `/organizations/${organizationId}/bulk-management`]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
});
