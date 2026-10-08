import { readFile } from "node:fs/promises";
import { crc32 } from "node:zlib";
import type { Page } from "@playwright/test";
import { signInAsNewUser } from "../support/auth";
import { expect, test } from "../support/test-base";

/**
 * Zip import and export, through the UI.
 *
 * The round trip is built from the app's own output: exporting produces a real
 * zip, and importing that same zip proves both halves without the test having
 * to hand-roll the container format.
 */

/**
 * Builds a zip with stored (uncompressed) entries.
 *
 * Hand-rolled rather than pulling in a zip library for one test file: with
 * STORED there is no compressor to write, only headers, and `zlib.crc32`
 * supplies the one checksum the format needs.
 */
function buildZip(files: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = Buffer.from(name, "utf8");
    const data = Buffer.from(content, "utf8");
    const crc = crc32(data);

    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0); // local file header
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(0, 8); // method: stored
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); // compressed size
    local.writeUInt32LE(data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBytes.length, 26);
    nameBytes.copy(local, 30);

    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0); // central directory header
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42); // offset of the local header
    nameBytes.copy(central, 46);

    locals.push(local, data);
    centrals.push(central);
    offset += local.length + data.length;
  }

  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, directory, end]);
}

async function newProject(page: Page, name: string) {
  const created = await page.request.post("/api/projects", {
    data: { name, template_id: "academic" },
  });
  expect(created.ok()).toBe(true);
  return (await created.json()).data.id as number;
}

async function openProject(page: Page, projectId: number) {
  await page.goto(`/project/${projectId}`);
  // Monaco only mounts on the client, so it stands in for "hydrated" -- a
  // menu clicked before that swallows the click.
  // A generous timeout, not the 5s default: Monaco is lazily loaded and a
  // suite running six browsers at once regularly needs longer than that.
  await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 30_000 });
}

/** Clicks File -> Download as .zip and returns the saved bytes. */
async function downloadProjectZip(page: Page) {
  await page.getByRole("button", { name: "File", exact: true }).click();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: "Download as .zip" }).click(),
  ]);

  const path = await download.path();
  return { name: download.suggestedFilename(), data: await readFile(path) };
}

test.describe("project export @backend", () => {
  test("downloads the project as a named zip", async ({ page, proof }) => {
    await signInAsNewUser(page, "export");
    const projectId = await newProject(page, "Export Me");
    await openProject(page, projectId);

    await page.getByRole("button", { name: "File", exact: true }).click();
    await expect(page.getByRole("menuitem", { name: "Download as .zip" })).toBeVisible();
    await proof("file menu with the zip download");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("menuitem", { name: "Download as .zip" }).click(),
    ]);

    expect(download.suggestedFilename()).toBe("Export Me.zip");
    const data = await readFile(await download.path());
    // "PK\x03\x04" -- the local file header every zip starts with.
    expect(data.subarray(0, 4).toString("binary")).toBe("PK");
  });

  test("serves the export as an attachment, not as text", async ({ page }) => {
    await signInAsNewUser(page, "export-headers");
    const projectId = await newProject(page, "Headers");

    const response = await page.request.get(`/api/projects/${projectId}/export`);

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/zip");
    // An export changes with every edit, so it must never be cached.
    expect(response.headers()["cache-control"]).toContain("no-store");
  });
});

test.describe("project import @backend", () => {
  test("creates a project from a zip and opens it", async ({ page, proof }) => {
    // The zip comes from the app's own export, so this is a true round trip.
    await signInAsNewUser(page, "import");
    const sourceId = await newProject(page, "Round Trip");
    await openProject(page, sourceId);
    const exported = await downloadProjectZip(page);

    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: "Import .zip" })).toBeVisible();
    await proof("dashboard with the import button");

    await page.locator('input[type="file"]').setInputFiles({
      name: "Imported Thesis.zip",
      mimeType: "application/zip",
      buffer: exported.data,
    });

    // Importing navigates straight into the new project, as creating one does.
    await page.waitForURL(/\/project\/\d+$/, { timeout: 30_000 });
    expect(page.url()).not.toContain(`/project/${sourceId}`);

    await expect(page.locator(".monaco-editor").first()).toBeVisible();
    await expect(page.getByText("main.tex").first()).toBeVisible();
    await expect(page.getByText("references.bib").first()).toBeVisible();
    await proof("imported project open in the editor");
  });

  test("the imported files carry their content", async ({ page }) => {
    await signInAsNewUser(page, "import-content");
    const sourceId = await newProject(page, "Content Source");
    await openProject(page, sourceId);
    const exported = await downloadProjectZip(page);

    await page.goto("/dashboard");
    await page.locator('input[type="file"]').setInputFiles({
      name: "Copy.zip",
      mimeType: "application/zip",
      buffer: exported.data,
    });
    await page.waitForURL(/\/project\/\d+$/, { timeout: 30_000 });

    const importedId = Number(page.url().split("/").pop());
    const detail = await page.request.get(`/api/projects/${importedId}`);
    const files = (await detail.json()).data.files as Array<{
      name: string;
      content: string | null;
    }>;

    const main = files.find((file) => file.name === "main.tex");
    expect(main?.content).toContain("documentclass");
    // A snapshot, not an S3 asset: the editor has to be able to edit it.
    expect(files.find((file) => file.name === "references.bib")?.content).not.toBeNull();
  });

  test("names the project after the uploaded file", async ({ page }) => {
    await signInAsNewUser(page, "import-naming");
    const sourceId = await newProject(page, "Naming Source");
    await openProject(page, sourceId);
    const exported = await downloadProjectZip(page);

    await page.goto("/dashboard");
    await page.locator('input[type="file"]').setInputFiles({
      name: "Quantum Notes.zip",
      mimeType: "application/zip",
      buffer: exported.data,
    });
    await page.waitForURL(/\/project\/\d+$/, { timeout: 30_000 });

    const importedId = Number(page.url().split("/").pop());
    const detail = await page.request.get(`/api/projects/${importedId}`);
    expect((await detail.json()).data.name).toBe("Quantum Notes");
  });

  test("names the files it could not take, instead of opening the project", async ({
    page,
    proof,
  }) => {
    // A zip carrying a Makefile and a .docx: both are skipped, and the import
    // stays on the dashboard so the user actually reads which ones.
    await signInAsNewUser(page, "import-skips");
    const withExtras = buildZip({
      "main.tex": "\\documentclass{article}\\begin{document}hi\\end{document}",
      Makefile: "all:\n\tlatexmk",
      "notes.docx": "not really a docx",
    });

    await page.goto("/dashboard");
    await page.locator('input[type="file"]').setInputFiles({
      name: "Mixed.zip",
      mimeType: "application/zip",
      buffer: withExtras,
    });

    await expect(page.getByText(/were left out/)).toBeVisible();
    await expect(page.getByText(/Makefile/)).toBeVisible();
    await expect(page.getByText(/notes\.docx/)).toBeVisible();
    // Deliberately still on the dashboard: navigating away would flash the
    // notice for a frame and throw it away.
    expect(page.url()).toContain("/dashboard");
    await proof("import reporting skipped files");

    await page.getByRole("button", { name: "Open the project" }).click();
    await page.waitForURL(/\/project\/\d+$/);
  });

  test("explains why a file that is not a zip was refused", async ({ page, proof }) => {
    await signInAsNewUser(page, "import-bad");
    await page.goto("/dashboard");

    await page.locator('input[type="file"]').setInputFiles({
      name: "main.tex",
      mimeType: "application/zip",
      buffer: Buffer.from("\\documentclass{article}"),
    });

    // The backend's own wording, which names the actual problem.
    await expect(page.getByText(/not a readable zip archive/i)).toBeVisible();
    expect(page.url()).toContain("/dashboard");
    await proof("import rejected with a reason");
  });
});
