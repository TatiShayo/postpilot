import { test, expect } from "@playwright/test";

test.describe("Compose page", () => {
  test("redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard/compose");

    await page.waitForURL("**/auth/login**", { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("login page has link to Compose from signup", async ({ page }) => {
    await page.goto("/auth/signup");

    await expect(
      page.getByRole("link", { name: /Sign in/i })
    ).toBeVisible();
  });
});
