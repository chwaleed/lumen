import { expect, test } from "../support/test-base";

test.describe("signup", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test("renders the registration form", async ({ page, proof }) => {
    await expect(page.getByRole("heading", { name: "Sign Up" })).toBeVisible();
    await expect(page.locator("#signup-name")).toBeVisible();
    await expect(page.locator("#signup-email")).toBeVisible();
    await expect(page.locator("#signup-password")).toBeVisible();
    await proof("empty signup form");
  });

  test("rejects a password under the minimum length before calling the API", async ({ page, proof }) => {
    await page.locator("#signup-name").fill("Ada Lovelace");
    await page.locator("#signup-email").fill("ada@example.com");
    await page.locator("#signup-password").fill("short");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
    await proof("short password rejected");
  });

  test("offers a route back to login", async ({ page, proof }) => {
    await page.getByRole("link", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await proof("login page");
  });

  // Signup establishes the session itself, so a new user goes straight to the
  // dashboard rather than being asked to log in again.
  test("creates an account and lands signed in on the dashboard @backend", async ({ page, proof }) => {
    const email = `e2e-signup-${Date.now()}@example.com`;

    await page.locator("#signup-name").fill("Ada Lovelace");
    await page.locator("#signup-email").fill(email);
    await page.locator("#signup-password").fill("password123");
    await proof("completed signup form");

    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await proof("signed in on the dashboard");
  });

  test("refuses an email that is already registered @backend", async ({ page, proof }) => {
    const email = `e2e-duplicate-${Date.now()}@example.com`;

    const signup = await page.request.post("/api/auth/signup", {
      data: { name: "First Owner", email, password: "password123" },
    });
    expect(signup.ok()).toBe(true);

    await page.locator("#signup-name").fill("Second Owner");
    await page.locator("#signup-email").fill(email);
    await page.locator("#signup-password").fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText("A user with this email already exists.")).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
    await proof("duplicate email rejected");
  });
});
