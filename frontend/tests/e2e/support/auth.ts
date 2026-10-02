import type { Page } from "@playwright/test";

/**
 * Signs a fresh user in through the real auth routes.
 *
 * `page.request` shares the browser context's cookie jar, so the httpOnly
 * session cookies the route sets are live for the page immediately — no UI
 * detour through the login form, and no storageState file to keep in sync.
 *
 * Every caller gets its own user so tests never contend over the same account.
 * Requires the backend: tag any test using this `@backend`.
 */
export async function signInAsNewUser(page: Page, label: string) {
  const email = `e2e-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const password = "password123";

  const signup = await page.request.post("/api/auth/signup", {
    data: { name: "E2E User", email, password },
  });

  if (!signup.ok()) {
    throw new Error(`signup failed for ${email}: ${signup.status()} ${await signup.text()}`);
  }

  const login = await page.request.post("/api/auth/login", { data: { email, password } });

  if (!login.ok()) {
    throw new Error(`login failed for ${email}: ${login.status()} ${await login.text()}`);
  }

  return { email, password };
}
