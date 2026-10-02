import { expect, test } from "../support/test-base";

test.describe("landing page", () => {
  test("presents the hero and routes into signup", async ({ page, proof }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Intelligent");
    await proof("hero");

    await page.getByRole("link", { name: "Start Writing" }).first().click();

    await expect(page).toHaveURL(/\/(signup|login)/);
    await proof("after start writing");
  });
});
