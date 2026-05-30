import { test, expect } from "@playwright/test";

test.describe("Auth flow", () => {
  test("signup page loads with the form", async ({ page }) => {
    await page.goto("/auth/signup");

    await expect(
      page.getByRole("heading", { name: /Create your account/i })
    ).toBeVisible();

    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirm")).toBeVisible();

    const submitButton = page.getByRole("button", { name: /Create Account/i });
    await expect(submitButton).toBeVisible();
  });

  test("login page loads with email and password fields", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(page.locator('#email[type="email"]')).toBeVisible();
    await expect(page.locator('#password[type="password"]')).toBeVisible();

    const signInButton = page.getByRole("button", { name: /Sign In/i });
    await expect(signInButton).toBeVisible();

    await expect(
      page.getByText("Don't have an account?")
    ).toBeVisible();
  });

  test("unauthenticated user is redirected from dashboard to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await page.waitForURL("**/auth/login**", { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
