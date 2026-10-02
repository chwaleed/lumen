import { expect, test } from "../support/test-base";

test.describe("login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders the credential form", async ({ page, proof }) => {
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await proof("empty login form");
  });

  // The input is type="email" required, so the browser's own constraint
  // validation blocks submission and the hook never runs.
  test("lets native validation block a malformed email", async ({ page, proof }) => {
    await page.locator("#login-email").fill("not-an-email");
    await page.locator("#login-password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.locator("#login-email")).toHaveJSProperty("validity.valid", false);
    await expect(page).toHaveURL(/\/login$/);
    await proof("native email validation");
  });

  // Password length has no native equivalent, so this is the app's own guard.
  test("rejects a password under the minimum length before calling the API", async ({ page, proof }) => {
    await page.locator("#login-email").fill("someone@example.com");
    await page.locator("#login-password").fill("short");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await proof("short password rejected");
  });

  test("offers a route to signup", async ({ page, proof }) => {
    await page.getByRole("link", { name: "Sign up" }).click();

    await expect(page).toHaveURL(/\/signup$/);
    await proof("signup page");
  });

  // Needs the API up: run with the backend, or exclude via --grep-invert @backend.
  // Asserts the backend's own wording rather than "an error appeared", so this
  // fails loudly when the API is down instead of passing on the network error.
  test("surfaces the server's rejection for unknown credentials @backend", async ({ page, proof }) => {
    await page.locator("#login-email").fill("definitely-not-a-user@example.com");
    await page.locator("#login-password").fill("wrong-password-1");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await proof("server rejected credentials");
  });
});
