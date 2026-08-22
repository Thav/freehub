import { test, expect } from "@playwright/test";

test("login, scoped search, and profile navigation work from one origin", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Freehub" })).toBeVisible();
  await page.getByLabel("Login").fill("manager");
  await page.getByLabel("Password").fill("spike-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ada Rider" })).toBeVisible();
  await page.getByRole("link", { name: "Ada Rider" }).click();
  await expect(page.getByRole("heading", { name: "Ada Rider" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in for project" })).toBeVisible();
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
