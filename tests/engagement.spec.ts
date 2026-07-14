import { test, expect, type Page } from "@playwright/test";

/**
 * Phase 2 engagement layer: points & levels, the notification bell, and
 * read-only public share pages, verified against the real stack.
 *
 * Requires Postgres up and migrated — see playwright.config.ts.
 */
const runId = Date.now().toString(36);
const account = {
  name: "Engagement Tester",
  email: `eng-${runId}@example.com`,
  password: "SuperSecret123",
};
const projectName = `Engagement ${runId}`;

test.describe.serial("engagement layer", () => {
  test("setup: register and create a project", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel(/name/i).fill(account.name);
    await page.getByLabel(/email/i).fill(account.email);
    await page.getByLabel(/password/i).fill(account.password);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole("button", { name: /new project/i }).click();
    await page.getByLabel(/project name/i).fill(projectName);
    await page.getByRole("button", { name: /^software$/i }).click();
    await page.getByRole("button", { name: /next/i }).click();
    await page.getByLabel(/vision \/ description/i).fill("Verify the engagement layer.");
    await page.getByRole("button", { name: /next/i }).click();
    await page.getByRole("button", { name: /create project/i }).click();
    await expect(page).toHaveURL(/\/projects\//);
  });

  test("notification bell opens with an empty state", async ({ page }) => {
    await logIn(page);
    await page.getByRole("button", { name: /notifications/i }).click();
    await expect(page.getByText(/all caught up/i)).toBeVisible();
  });

  test("completing a milestone awards points in the project header", async ({ page }) => {
    await logIn(page);
    await openProject(page);

    await page.getByRole("tab", { name: /milestones/i }).click();
    const milestoneCheckbox = page
      .getByRole("checkbox", { name: /complete/i })
      .first();
    await milestoneCheckbox.click();
    await expect(milestoneCheckbox).toBeChecked();

    // Points total in the header moves off zero
    await expect(page.getByText(/[1-9]\d* pts/)).toBeVisible();
  });

  test("public share link shows a read-only project page", async ({ page, browser }) => {
    await logIn(page);
    await openProject(page);

    await page.getByRole("tab", { name: /settings/i }).click();
    await page.getByRole("switch", { name: /public sharing/i }).click();
    const shareUrl = await page.locator("#share-url").inputValue();
    expect(shareUrl).toContain("/share/");

    // Visit the share URL as a logged-out visitor
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();
    await anonPage.goto(shareUrl);

    await expect(anonPage.getByRole("heading", { name: projectName })).toBeVisible();
    // Read-only: no editing controls on the public page
    await expect(anonPage.getByRole("button", { name: /log update/i })).toHaveCount(0);
    await expect(anonPage.getByRole("tab")).toHaveCount(0);

    await anonContext.close();
  });

  test("revoking the link makes the share URL private again", async ({ page, browser }) => {
    await logIn(page);
    await openProject(page);

    await page.getByRole("tab", { name: /settings/i }).click();
    const shareUrl = await page.locator("#share-url").inputValue();

    await page.getByRole("button", { name: /revoke link/i }).click();
    await page.getByRole("button", { name: /revoke public link/i }).click();

    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();
    await anonPage.goto(shareUrl);
    await expect(anonPage.getByText(/project not found/i)).toBeVisible();
    await anonContext.close();
  });
});

async function openProject(page: Page) {
  await page.getByRole("link", { name: new RegExp(projectName) }).first().click();
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
}

async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(account.email);
  await page.getByLabel(/password/i).fill(account.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
