import type { Page } from "@playwright/test";
import { signInAsNewUser } from "../support/auth";
import { expect, test } from "../support/test-base";

/**
 * The compile flow, through a real browser.
 *
 * Two layers, because they fail for different reasons:
 *
 * - `@backend` tests need the API (the project route is a Server Component, so
 *   `page.route` cannot fake the project itself) but stub the compile endpoints
 *   in the browser. They assert how the preview behaves, without TeX.
 * - `@worker` tests additionally need a compile worker and the TeX image, and
 *   assert that a real .tex becomes a real PDF on screen.
 */

const JOB_ID = 4242;

// Enough to be served as application/pdf. These tests assert on headers,
// the iframe and the absence of a download -- not on rendered glyphs -- so a
// byte-accurate document would buy nothing.
const FAKE_PDF = Buffer.from("%PDF-1.7\n%fake compile output\n%%EOF\n");

function envelope(data: unknown, message = "ok") {
  return JSON.stringify({ success: true, message, data });
}

function job(overrides: Record<string, unknown> = {}) {
  return {
    id: JOB_ID,
    status: "success",
    engine: "pdflatex",
    exit_code: 0,
    duration_ms: 1418,
    error_count: 0,
    has_pdf: true,
    has_log: true,
    ...overrides,
  };
}

/**
 * Fakes the four compile endpoints the store talks to.
 *
 * One handler for all of them rather than four `page.route` calls: Playwright
 * resolves overlapping patterns by registration order, and a single dispatch
 * keeps that from mattering.
 */
async function stubCompile(
  page: Page,
  options: { finished?: Record<string, unknown>; log?: Record<string, unknown> } = {},
) {
  const finished = job(options.finished);

  await page.route("**/api/projects/*/compile**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (url.pathname.endsWith("/pdf")) {
      // Mirrors what the route handler really sends: a content type and no
      // content-disposition, so the browser renders rather than saves.
      return route.fulfill({
        status: 200,
        contentType: "application/pdf",
        body: FAKE_PDF,
      });
    }

    if (url.pathname.endsWith("/log")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: envelope({
          job_id: JOB_ID,
          status: finished.status,
          error_count: finished.error_count,
          errors: [],
          warnings: [],
          log: "This is pdfTeX, Version 3.141592653",
          ...options.log,
        }),
      });
    }

    if (method === "POST") {
      return route.fulfill({
        status: 202,
        contentType: "application/json",
        body: envelope(job({ status: "queued", has_pdf: false, duration_ms: null })),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: envelope(finished),
    });
  });
}

/** Records any file the browser tries to save during a test. */
function watchDownloads(page: Page) {
  const saved: string[] = [];
  page.on("download", (download) => saved.push(download.suggestedFilename()));
  return saved;
}

async function newProject(page: Page, name: string) {
  const created = await page.request.post("/api/projects", {
    data: { name, template_id: "academic" },
  });
  expect(created.ok()).toBe(true);
  return (await created.json()).data.id as number;
}

/**
 * Opens the editor and waits for it to be interactive.
 *
 * Playwright considers a server-rendered button clickable the moment it is
 * painted, which is before React has attached its handler -- clicking then is
 * silently swallowed. Monaco only ever mounts on the client, so its presence is
 * a usable stand-in for "hydrated".
 */
async function openProject(page: Page, projectId: number) {
  await page.goto(`/project/${projectId}`);
  // A generous timeout, not the 5s default: Monaco is lazily loaded and a
  // suite running six browsers at once regularly needs longer than that.
  await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 30_000 });
}

/** The preview pane's Compile button, as opposed to the top bar's. */
function compileButton(page: Page) {
  return page.getByRole("button", { name: "Compile", exact: true }).last();
}

test.describe("compile preview @backend", () => {
  let projectId: number;

  test.beforeEach(async ({ page }) => {
    await signInAsNewUser(page, "compile");
    projectId = await newProject(page, "Compile Project");
  });

  test("starts with an empty preview and no PDF pane", async ({ page, proof }) => {
    await openProject(page, projectId);

    await expect(page.getByText("No preview yet")).toBeVisible();
    await expect(page.locator('iframe[title="Compiled PDF preview"]')).toHaveCount(0);
    await proof("preview before compiling");
  });

  test("shows the compiled PDF in the preview instead of downloading it", async ({
    page,
    proof,
  }) => {
    await stubCompile(page);
    const saved = watchDownloads(page);

    await openProject(page, projectId);
    await compileButton(page).click();

    const viewer = page.locator('iframe[title="Compiled PDF preview"]');
    await expect(viewer).toBeVisible();
    await expect(page.getByText(/Compiled in/)).toBeVisible();

    // The point of the whole feature: the bytes are rendered in the page, and
    // nothing was sent to the downloads folder.
    expect(saved).toEqual([]);
    await proof("compiled PDF in the preview");
  });

  test("asks the viewer to hide the thumbnail sidebar", async ({ page }) => {
    await stubCompile(page);

    await openProject(page, projectId);
    await compileButton(page).click();

    const viewer = page.locator('iframe[title="Compiled PDF preview"]');
    await expect(viewer).toBeVisible();

    // The sidebar is Chrome's, not ours, so the fragment is the only handle on
    // it -- and it is what keeps the page readable in a third-width pane.
    const src = await viewer.getAttribute("src");
    expect(src).toContain(`/api/projects/${projectId}/compile/${JOB_ID}/pdf`);
    expect(src).toContain("navpanes=0");
    expect(src).toContain("view=FitH");
  });

  test("offers the PDF for export under the project's name", async ({ page }) => {
    await stubCompile(page);

    await openProject(page, projectId);
    await compileButton(page).click();
    await expect(page.locator('iframe[title="Compiled PDF preview"]')).toBeVisible();

    const exportLink = page.getByRole("link", { name: "Export PDF" });
    await expect(exportLink).toHaveAttribute("download", "Compile Project.pdf");
    await expect(exportLink).toHaveAttribute(
      "href",
      `/api/projects/${projectId}/compile/${JOB_ID}/pdf`,
    );
  });

  test("shows parsed problems rather than a PDF when the build fails", async ({
    page,
    proof,
  }) => {
    await stubCompile(page, {
      finished: { status: "failure", exit_code: 1, error_count: 1, has_pdf: false },
      log: {
        errors: [
          {
            severity: "error",
            message: "Undefined control sequence \\foo",
            file: "main.tex",
            line: 12,
          },
        ],
      },
    });

    await openProject(page, projectId);
    await compileButton(page).click();

    await expect(page.getByText("Undefined control sequence \\foo")).toBeVisible();
    // The file:line the diagnostic carries, not the sidebar entry or the tab,
    // both of which also say "main.tex".
    await expect(page.getByText("main.tex:12")).toBeVisible();
    await expect(page.locator('iframe[title="Compiled PDF preview"]')).toHaveCount(0);
    await proof("compile errors in the preview");
  });
});

test.describe("real compilation @backend @worker", () => {
  // Needs a compile worker and the TeX image; see docs/plans/latex-compilation.md.
  // Excluded from `test:e2e` on purpose -- run it with `bun run test:e2e:worker`.
  test.setTimeout(180_000);

  test("turns the starting project into a PDF on screen", async ({ page, proof }) => {
    await signInAsNewUser(page, "compile-real");
    const projectId = await newProject(page, "Real Compile");
    const saved = watchDownloads(page);

    await openProject(page, projectId);
    await compileButton(page).click();

    const viewer = page.locator('iframe[title="Compiled PDF preview"]');
    await expect(viewer).toBeVisible({ timeout: 150_000 });
    await expect(page.getByText(/Compiled in/)).toBeVisible();
    expect(saved).toEqual([]);

    // The bytes behind the iframe are a real PDF, not an error page.
    const src = (await viewer.getAttribute("src")) ?? "";
    const pdf = await page.request.get(src.split("#")[0]);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    // Whatever disposition reaches the browser must not be an attachment, or
    // the iframe above would have been a download instead of a preview.
    expect(pdf.headers()["content-disposition"] ?? "").not.toContain("attachment");
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

    await proof("real compiled PDF");
  });
});
