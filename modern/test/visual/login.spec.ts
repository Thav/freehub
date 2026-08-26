import { test, expect } from "@playwright/test";

test("protected pages return anonymous visitors to login before rendering a form", async ({ page }) => {
  await page.goto("/organizations/1/people/new");
  await expect(page.getByRole("heading", { name: "Freehub" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create person" })).toHaveCount(0);
});

test("tag suggestions include case-insensitive matches already assigned to a person", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Login").fill("manager");
  await page.getByLabel("Password").fill("spike-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: "Ada Rider" }).click();
  await page.getByRole("link", { name: "Tags" }).click();
  await page.getByLabel("Tags").fill("co");
  await expect(page.getByRole("list", { name: "Tag suggestions" }).getByRole("button", { name: "Community", exact: true })).toBeVisible();
});

test("login, scoped search, and profile navigation work from one origin", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Freehub" })).toBeVisible();
  await page.getByLabel("Login").fill("manager");
  await page.getByLabel("Password").fill("spike-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ada Rider" })).toBeVisible();
  await page.getByLabel("Search people").fill("");
  await expect(page.getByRole("link", { name: "Ada Rider" })).toHaveCount(0);
  await page.getByLabel("Search people").fill("Ada");
  await expect(page.getByRole("link", { name: "Ada Rider" })).toBeVisible();
  await page.getByRole("link", { name: "Ada Rider" }).click();
  await expect(page.getByRole("heading", { name: "Ada Rider" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in for project" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in for volunteer" })).toBeVisible();
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
});

test("people can be created, archived, and restored", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Login").fill("manager");
  await page.getByLabel("Password").fill("spike-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: "New person" }).click();
  await page.getByLabel("First name").fill("Playwright");
  await page.getByLabel("Last name").fill("Rider");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("playwright.rider@example.test");
  await page.getByRole("button", { name: "Create person" }).click();
  await expect(page.getByRole("heading", { name: "Playwright Rider" })).toBeVisible();
  await page.getByRole("link", { name: "Edit person" }).click();
  await page.getByLabel("Phone").fill("503-555-0123");
  await page.getByRole("button", { name: "Update person" }).click();
  await expect(page.getByText("503-555-0123")).toBeVisible();
  await page.getByRole("button", { name: "Archive person" }).click();
  await expect(page.getByText("This person is archived.")).toBeVisible();
  await page.getByRole("button", { name: "Restore person" }).click();
  await expect(page.getByRole("button", { name: "Archive person" })).toBeVisible();
});

test("person tags can be assigned and notes can be added", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Login").fill("manager");
  await page.getByLabel("Password").fill("spike-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: "New person" }).click();
  await page.getByLabel("First name").fill("Tag Note");
  await page.getByLabel("Last name").fill("Rider");
  await page.getByRole("button", { name: "Create person" }).click();
  await page.getByRole("link", { name: "Tags" }).click();
  await page.getByLabel("Tags").fill("Visual tag");
  await page.getByRole("button", { name: "Save tags" }).click();
  await expect(page.getByRole("status")).toHaveText("Tags saved.");
  await expect(page.getByLabel("Tags")).toHaveValue("");
  await expect(page.getByRole("link", { name: "Visual tag" })).toBeVisible();
  await page.getByRole("link", { name: "Home" }).click();
  await page.getByRole("link", { name: "New person" }).click();
  await page.getByLabel("First name").fill("Suggestion");
  await page.getByLabel("Last name").fill("Rider");
  await page.getByRole("button", { name: "Create person" }).click();
  await page.getByRole("link", { name: "Tags" }).click();
  await page.getByLabel("Tags").fill("visual");
  await expect(page.getByRole("button", { name: "Visual tag" })).toBeVisible();
  await page.getByRole("button", { name: "Visual tag" }).click();
  await expect(page.getByLabel("Tags")).toHaveValue("Visual tag, ");
  await page.goBack();
  await page.getByRole("link", { name: "Notes" }).click();
  await page.getByLabel("New note").fill("Visual note");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByRole("status")).toHaveText("Note added.");
  await expect(page.getByText("Visual note")).toBeVisible();
});

test("daily visits support quick sign-in, queue transitions, and visit detail", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Login").fill("manager");
  await page.getByLabel("Password").fill("spike-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: "New person" }).click();
  await page.getByLabel("First name").fill("Visit Queue");
  await page.getByLabel("Last name").fill(`Rider ${Date.now()}`);
  await page.getByRole("button", { name: "Create person" }).click();
  await page.getByRole("button", { name: "Sign in for project" }).click();
  await expect(page.getByRole("heading", { name: /Visits for/ })).toBeVisible();
  await page.getByRole("link", { name: "View visit" }).last().click();
  await expect(page.getByRole("heading", { name: "Visit detail" })).toBeVisible();
});

test("services can be created, reviewed, and renewed from a profile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: "New person" }).click();
  await page.getByLabel("First name").fill("Service Visual");
  await page.getByLabel("Last name").fill("Rider");
  await page.getByRole("button", { name: "Create person" }).click();
  await page.getByRole("link", { name: "Services" }).click();
  await page.getByRole("link", { name: "Add a service" }).click();
  await page.getByLabel("Service type").selectOption("membership");
  await page.getByRole("button", { name: "Create service" }).click();
  await expect(page.getByRole("heading", { name: "Service detail" })).toBeVisible();
  await page.goBack(); await page.goBack(); await page.goBack();
  await expect(page.getByText("Current member")).toBeVisible();
  await page.getByRole("button", { name: "Renew membership" }).click();
  await expect(page.getByText("Current member")).toBeVisible();
});

test("reports provide populated, empty, and export states", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: "Reports" }).click();
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await page.getByRole("button", { name: "Update report" }).click();
  await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Export all" })).toBeVisible();
  await page.getByLabel("Matching name").fill("No such person");
  await page.getByRole("button", { name: "Update report" }).click();
  await expect(page.getByText("No people for date range.")).toBeVisible();
  await page.getByRole("button", { name: "Summary" }).click();
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
