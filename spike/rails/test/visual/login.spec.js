const { test, expect } = require("playwright/test");

test("login, scoped search, and profile navigation work from one origin", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Freehub" })).toBeVisible();
  await page.getByLabel("Login", { exact: true }).fill("manager");
  await page.getByLabel("Password", { exact: true }).fill("spike-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
  await page.getByRole("link", { name: "Ada Rider" }).click();
  await expect(page.getByRole("heading", { name: "Ada Rider" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in for project" })).toBeVisible();
});
