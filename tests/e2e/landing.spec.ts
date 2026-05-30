import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads with hero section and CTA", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toContainText("30 Days of Social Content");

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    const ctaButton = page.getByRole("button", { name: /Get Started Free/i });
    await expect(ctaButton).toBeVisible();

    await expect(page.getByText("No credit card required")).toBeVisible();
  });

  test("pricing section is present", async ({ page }) => {
    await page.goto("/");

    const pricingHeading = page.getByRole("heading", {
      name: /Simple, transparent pricing/i,
    });
    await expect(pricingHeading).toBeVisible({ timeout: 10000 });

    const pricingSection = page.locator("#pricing");
    await expect(
      pricingSection.getByRole("heading", { name: "Free", exact: true })
    ).toBeVisible();
    await expect(
      pricingSection.getByRole("heading", { name: "Pro", exact: true })
    ).toBeVisible();
    await expect(
      pricingSection.getByRole("heading", { name: "Business", exact: true })
    ).toBeVisible();

    const proButton = page.getByRole("link", { name: /Start Pro Trial/i });
    await expect(proButton).toBeVisible();
  });

  test("comparison table renders", async ({ page }) => {
    await page.goto("/");

    const compareHeading = page.getByRole("heading", {
      name: /How we stack up/i,
    });
    await expect(compareHeading).toBeVisible({ timeout: 10000 });

    await expect(
      page.locator("#compare").getByText("PostPilot", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("Hootsuite")).toBeVisible();
    await expect(page.getByText("Buffer")).toBeVisible();
  });

  test("email capture form handles submission", async ({ page }) => {
    await page.goto("/");

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    await emailInput.fill("test@example.com");
    await page.getByRole("button", { name: /Get Started Free/i }).click();

    // Toast should appear — success if Supabase is up, error if not
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 10000 });
  });
});
