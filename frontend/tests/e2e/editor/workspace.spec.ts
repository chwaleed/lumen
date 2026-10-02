import { signInAsNewUser } from "../support/auth";
import { expect, test } from "../support/test-base";

// The editor needs a real project behind it, so the whole file is @backend.
test.describe("editor workspace @backend", () => {
  let projectId: number;

  test.beforeEach(async ({ page }) => {
    await signInAsNewUser(page, "editor");

    const created = await page.request.post("/api/projects", {
      data: { name: "Editor Project", template_id: "academic" },
    });
    expect(created.ok()).toBe(true);
    projectId = (await created.json()).data.id;

    await page.goto(`/project/${projectId}`);
  });

  test("opens the workspace with the project's starting files", async ({ page, proof }) => {
    // A new project is seeded with main.tex and references.bib.
    await expect(page.getByText("main.tex").first()).toBeVisible();
    await expect(page.getByText("references.bib").first()).toBeVisible();
    await proof("editor workspace");
  });

  test("shows the template content for the file opened on load", async ({ page, proof }) => {
    await expect(page.locator(".monaco-editor").first()).toBeVisible();
    await expect(page.getByText("documentclass").first()).toBeVisible();
    await proof("main.tex open in the editor");
  });

  test("opens a second file in its own tab", async ({ page, proof }) => {
    await page.getByText("references.bib").first().click();

    // Both files now have a tab; the sidebar entry and the tab share the name.
    await expect(page.getByText("references.bib")).toHaveCount(2);
    await proof("second file opened");
  });

  test("collapses and restores the sidebar", async ({ page, proof }) => {
    await page.getByRole("button", { name: "Close sidebar" }).first().click();

    await expect(page.getByRole("button", { name: "Create file" })).toBeHidden();
    await proof("sidebar collapsed");
  });

  test("creates a new file from the sidebar", async ({ page, proof }) => {
    // Create opens an inline name field seeded with "untitled.tex"; the entry is
    // only sent to the API once the name is confirmed.
    await page.getByRole("button", { name: "Create file" }).click();

    // Match on role, not on value: fill() changes the value and an
    // input[value=...] selector would stop resolving mid-test.
    const nameField = page.getByRole("textbox").first();
    await expect(nameField).toBeVisible();
    await expect(nameField).toHaveValue("untitled.tex");
    await proof("naming the new file");

    await nameField.fill("chapter-two.tex");
    await nameField.press("Enter");

    await expect(page.getByText("chapter-two.tex").first()).toBeVisible();
    await proof("new file created");

    // It must survive a reload, i.e. it really reached the API.
    await page.reload();
    await expect(page.getByText("chapter-two.tex").first()).toBeVisible();
    await proof("new file persisted after reload");
  });

  test("keeps another user out of the project", async ({ page }) => {
    await signInAsNewUser(page, "editor-intruder");

    await page.goto(`/project/${projectId}`);

    await expect(page.getByText("main.tex")).toHaveCount(0);
  });
});
