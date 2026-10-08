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
    // Wait for hydration before any test clicks anything: a server-rendered
    // button is clickable the moment it paints, which is before React attaches
    // its handler, and the click is then silently swallowed. Monaco only ever
    // mounts on the client, so its presence stands in for "hydrated".
    await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 30_000 });
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

    // An <input>, specifically: Monaco exposes a div[role="textbox"] too, and
    // a bare role lookup resolves to whichever renders first.
    const nameField = page.locator('input:not([type="file"])').first();
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

  test("scrolls the file list rather than growing past the window", async ({ page }) => {
    // The scroll area is a flex child, and a flex child defaults to
    // min-height:auto -- so without min-h-0 it grows to fit every file and the
    // list runs off the bottom of the window instead of scrolling.
    for (const name of ["one", "two", "three", "four", "five", "six", "seven", "eight"]) {
      await page.getByRole("button", { name: "Create file" }).click();
      const nameField = page.locator('input:not([type="file"])').first();
      await expect(nameField).toBeVisible();
      await nameField.fill(`${name}.tex`);
      await nameField.press("Enter");
      await expect(page.getByText(`${name}.tex`).first()).toBeVisible();
    }

    const viewport = page.locator("[data-radix-scroll-area-viewport]").first();
    const fits = await viewport.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { onScreen: box.bottom <= window.innerHeight + 1, scrolls: element.scrollHeight > 0 };
    });
    expect(fits.onScreen).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(
      true,
    );
  });

  test("scrolls the tab strip across the editor's full width", async ({ page, proof }) => {
    // Enough tabs to overflow. They keep their width and the strip slides,
    // rather than every tab squashing until the names are unreadable.
    const files = page.locator("[data-radix-scroll-area-viewport] span.truncate");
    const count = Math.min(await files.count(), 6);
    for (let index = 0; index < count; index += 1) {
      await files.nth(index).click();
    }

    const strip = page.locator(".scrollbar-none").first();
    const measurements = await strip.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      // The strip owns the whole tab row; a trailing spacer used to claim
      // flex-1 beside it and take half the width.
      right: Math.round(element.getBoundingClientRect().right),
      rowRight: Math.round(
        element.closest("div.border-b")?.getBoundingClientRect().right ?? -1,
      ),
      scrollbarWidth: getComputedStyle(element).scrollbarWidth,
    }));

    expect(Math.abs(measurements.right - measurements.rowRight)).toBeLessThanOrEqual(2);
    // Hidden, because it would sit on the border between tabs and editor.
    expect(measurements.scrollbarWidth).toBe("none");
    await proof("file tabs across the editor width");
  });

  test("keeps another user out of the project", async ({ page }) => {
    await signInAsNewUser(page, "editor-intruder");

    await page.goto(`/project/${projectId}`);

    await expect(page.getByText("main.tex")).toHaveCount(0);
  });
});
