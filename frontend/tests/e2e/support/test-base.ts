import path from "node:path";
import { test as base, expect, type TestInfo } from "@playwright/test";

/**
 * Takes a named screenshot and attaches it to the HTML report.
 *
 * Call it at each point a reviewer would want to see, so a passing run leaves
 * behind an ordered visual record rather than only a green tick.
 */
export type Proof = (name: string) => Promise<string>;

const E2E_MARKER = `${path.sep}tests${path.sep}e2e${path.sep}`;
const SCREENSHOT_ROOT = path.join("tests", "artifacts", "screenshots");

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Mirrors the spec's own folder hierarchy into the screenshot output, so
 * tests/e2e/auth/login.spec.ts lands in
 * tests/artifacts/screenshots/auth/login/<test-title>/01-step.png
 *
 * Derived from the spec's absolute path rather than config.rootDir, which
 * Playwright resolves to testDir rather than the config's own folder.
 */
function screenshotDirFor(testInfo: TestInfo) {
  const markerIndex = testInfo.file.lastIndexOf(E2E_MARKER);

  if (markerIndex === -1) {
    throw new Error(`Spec lives outside tests/e2e, cannot place screenshots: ${testInfo.file}`);
  }

  const projectRoot = testInfo.file.slice(0, markerIndex);
  const specPath = testInfo.file.slice(markerIndex + E2E_MARKER.length);
  const featurePath = path.dirname(specPath);
  const specName = path.basename(specPath).replace(/\.spec\.ts$/, "");

  return path.join(
    projectRoot,
    SCREENSHOT_ROOT,
    featurePath === "." ? "" : featurePath,
    specName,
    slugify(testInfo.title),
  );
}

// Next's dev-mode overlay badge is not part of the app and should not appear in proof.
const HIDE_DEV_OVERLAY = `nextjs-portal { display: none !important; }`;
const ANIMATION_SETTLE_MS = 1000;

export const test = base.extend<{ proof: Proof }>({
  proof: async ({ page }, use, testInfo) => {
    const directory = screenshotDirFor(testInfo);
    let step = 0;

    await use(async (name) => {
      step += 1;
      const file = path.join(directory, `${String(step).padStart(2, "0")}-${slugify(name)}.png`);

      await page.evaluate(
        async ({ css, settleTimeout }) => {
          const STYLE_ID = "proof-screenshot-style";
          if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement("style");
            style.id = STYLE_ID;
            style.textContent = css;
            document.head.append(style);
          }

          // Let entrance animations finish so panels are not caught mid-fade.
          // Playwright's `animations: "disabled"` does not settle the JS-driven
          // ones motion uses, hence waiting on them here. Capped so a looping
          // animation (spinner, pulse) cannot hang the screenshot.
          await Promise.race([
            Promise.allSettled(document.getAnimations().map((animation) => animation.finished)),
            new Promise((resolve) => setTimeout(resolve, settleTimeout)),
          ]);
        },
        { css: HIDE_DEV_OVERLAY, settleTimeout: ANIMATION_SETTLE_MS },
      );

      // Deliberately not passing `animations: "disabled"` — it rewinds motion's
      // entrance animations to opacity 0 rather than completing them. The settle
      // above is what makes these screenshots deterministic.
      await page.screenshot({ path: file, fullPage: true });
      await testInfo.attach(name, { path: file, contentType: "image/png" });

      return file;
    });
  },
});

export { expect };
