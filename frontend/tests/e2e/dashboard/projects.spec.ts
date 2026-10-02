import { signInAsNewUser } from "../support/auth";
import { expect, test } from "../support/test-base";

// Everything here needs a real session, so the whole file is @backend.
test.describe("dashboard @backend", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsNewUser(page, "dashboard");
  });

  test("shows the dashboard to a signed-in user", async ({ page, proof }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Start something new" })).toBeVisible();
    await proof("dashboard");
  });

  test("reaches the projects and templates pages", async ({ page, proof }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/projects$/);
    await proof("projects page");

    await page.goto("/templates");
    await expect(page).toHaveURL(/\/templates$/);
    await proof("templates page");
  });

  test("lists a project created through the API @backend", async ({ page, proof }) => {
    const created = await page.request.post("/api/projects", {
      data: { name: "Quantum Thesis", template_id: "academic" },
    });
    expect(created.ok()).toBe(true);

    await page.goto("/projects");

    await expect(page.getByText("Quantum Thesis").first()).toBeVisible();
    await proof("project listed");
  });
});

test.describe("route protection", () => {
  // proxy.ts guards these paths; without cookies they must bounce to login.
  for (const path of ["/dashboard", "/projects", "/templates"]) {
    test(`redirects an anonymous visitor away from ${path}`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("sends a signed-in user away from the login page @backend", async ({ page, proof }) => {
    await signInAsNewUser(page, "already-signed-in");

    await page.goto("/login");

    await expect(page).toHaveURL(/\/dashboard/);
    await proof("login redirects to dashboard");
  });
});
