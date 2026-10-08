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

/**
 * A valid single-page PDF, built here rather than committed as a fixture.
 *
 * It has to be genuinely valid now: the viewer parses it with pdf.js, which
 * refuses a stub of the "%PDF-1.7 ... %%EOF" sort the iframe viewer used to
 * accept. Offsets are computed because the xref table has to point at the
 * real byte positions.
 */
function minimalPdf(): Buffer {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> >>",
  ];

  let body = "%PDF-1.7\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(body, "latin1");
}

const FAKE_PDF = minimalPdf();

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
      // content-disposition. pdf.js fetches these bytes itself, so a browser
      // download can only happen if something is badly wrong.
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
    await expect(page.getByLabel("Compiled PDF preview")).toHaveCount(0);
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

    const viewer = page.getByLabel("Compiled PDF preview");
    await expect(viewer).toBeVisible();
    await expect(page.getByText(/Compiled in/)).toBeVisible();

    // The point of the whole feature: the bytes are rendered in the page, and
    // nothing was sent to the downloads folder.
    expect(saved).toEqual([]);
    await proof("compiled PDF in the preview");
  });

  test("keeps the compile controls in the top bar, not above the preview", async ({
    page,
    proof,
  }) => {
    await stubCompile(page);

    await openProject(page, projectId);
    await compileButton(page).click();
    await expect(page.getByLabel("Compiled PDF preview")).toBeVisible();

    // The preview pane is content only. A header strip here cost the PDF ~40px
    // of height and repeated a Compile button that already exists above.
    const header = page.locator("header");
    await expect(header.getByText(/Compiled in/)).toBeVisible();
    await expect(page.getByText("Preview", { exact: true })).toHaveCount(0);

    // One Compile button in the whole page, not two.
    await expect(page.getByRole("button", { name: "Compile", exact: true })).toHaveCount(1);

    // No PDF chip: the PDF is the default view, so the chip would be lit
    // almost always and do nothing when pressed.
    await expect(page.getByRole("button", { name: "PDF", exact: true })).toHaveCount(0);
    await proof("compile controls in the top bar");
  });

  test("renders the pages itself, with our own toolbar", async ({ page, proof }) => {
    await stubCompile(page);

    await openProject(page, projectId);
    await compileButton(page).click();

    const viewer = page.getByLabel("Compiled PDF preview");
    await expect(viewer).toBeVisible();

    // Chrome's viewer gave us a toolbar we could neither restyle nor drive,
    // and it cost ~40px of a pane that is only a third of the window.
    await expect(viewer.getByText("1 / 1")).toBeVisible();
    await expect(viewer.getByRole("button", { name: "Fit to width" })).toBeVisible();
    await expect(viewer.getByRole("button", { name: "Zoom in" })).toBeVisible();

    // A real canvas, drawn by pdf.js -- not a plugin we have no control over.
    await expect(viewer.locator("canvas")).toHaveCount(1);
    await proof("pdf rendered by pdf.js");
  });

  test("offers the PDF for export under the project's name", async ({ page }) => {
    await stubCompile(page);

    await openProject(page, projectId);
    await compileButton(page).click();
    await expect(page.getByLabel("Compiled PDF preview")).toBeVisible();

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

    // The problem count is a toggle in the top bar; the pane follows the
    // failed compile on its own, with no click needed.
    await expect(page.locator("header").getByRole("button", { name: "1" })).toBeVisible();
    await expect(page.getByText("Undefined control sequence \\foo")).toBeVisible();
    // The file:line the diagnostic carries, not the sidebar entry or the tab,
    // both of which also say "main.tex".
    await expect(page.getByText("main.tex:12")).toBeVisible();
    await expect(page.getByLabel("Compiled PDF preview")).toHaveCount(0);
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

    const viewer = page.getByLabel("Compiled PDF preview");
    await expect(viewer).toBeVisible({ timeout: 150_000 });
    await expect(page.getByText(/Compiled in/)).toBeVisible();
    expect(saved).toEqual([]);

    // pdf.js parsed real compiler output and painted a page. Nothing a stub or
    // an error page could produce -- and the inline Content-Disposition this
    // depends on has its own test in backend/tests/api/compiles/.
    await expect(viewer.locator("canvas").first()).toBeVisible();
    await expect(viewer.getByText(/^\d+ \/ \d+$/)).toBeVisible();

    await proof("real compiled PDF");
  });
});
