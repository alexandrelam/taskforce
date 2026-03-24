import { expect, test } from "@playwright/test";

test("loads the empty-state board", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("No projects selected")).toBeVisible();
  await expect(page.getByText("Select up to 3 projects from the dropdown above")).toBeVisible();
});
