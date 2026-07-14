import { test, expect, type Page } from "@playwright/test";

/**
 * MVP core loop: a brand-new user signs up, creates a project with
 * milestone templates, tracks work (todo, journal update, milestone),
 * and sees it all reflected on the timeline and dashboard.
 *
 * Requires Postgres up and migrated — see playwright.config.ts.
 */
const runId = Date.now().toString(36);
const account = {
  name: "E2E Tester",
  email: `e2e-${runId}@example.com`,
  password: "SuperSecret123",
};
const projectName = `E2E Launch ${runId}`;

async function openProjectTab(page: Page, tabName: RegExp) {
  await page.getByRole("tab", { name: tabName }).click();
}

test.describe.serial("MVP core loop", () => {
  test("signup lands on an empty dashboard", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel(/name/i).fill(account.name);
    await page.getByLabel(/email/i).fill(account.email);
    await page.getByLabel(/password/i).fill(account.password);
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("button", { name: /create your first project/i }),
    ).toBeVisible();
  });

  test("creates a software project with milestone templates", async ({ page }) => {
    await logIn(page);

    // Header button also works when a retry already created a project
    await page.getByRole("button", { name: /new project/i }).click();
    await page.getByLabel(/project name/i).fill(projectName);
    await page.getByRole("button", { name: /^software$/i }).click();
    await page.getByRole("button", { name: /next/i }).click();
    await page
      .getByLabel(/vision \/ description/i)
      .fill("Ship the MVP core loop end to end.");
    await page.getByRole("button", { name: /next/i }).click();
    await page.getByRole("button", { name: /create project/i }).click();

    // Creating a project lands on its detail page
    await expect(page).toHaveURL(/\/projects\//);
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  });

  test("tracks a todo, journal update, and milestone completion", async ({ page }) => {
    await logIn(page);
    await openProject(page);

    // Todo: add and complete
    await openProjectTab(page, /todos/i);
    await page.getByLabel(/^todo title$/i).fill("Write launch notes");
    await page.getByRole("button", { name: /^add$/i }).click();
    // The accessible name flips from "Complete …" to "Uncheck …" when done,
    // so match on the stable todo title.
    const todoCheckbox = page.getByRole("checkbox", {
      name: /write launch notes/i,
    });
    await expect(todoCheckbox).toBeVisible();
    await todoCheckbox.click();
    await expect(todoCheckbox).toBeChecked();

    // Journal: log an update
    await openProjectTab(page, /journal/i);
    await page.getByRole("button", { name: /log update/i }).first().click();
    await page.getByLabel(/entry title/i).fill("First update");
    await page.getByLabel(/entry body/i).click();
    await page.keyboard.type("We shipped the first slice of the MVP.");
    await page.getByLabel(/mood/i).selectOption("win");
    await page.getByRole("button", { name: /save entry/i }).click();
    await expect(page.getByText("First update")).toBeVisible();

    // Milestone: complete a templated one
    await openProjectTab(page, /milestones/i);
    const milestoneCheckbox = page
      .getByRole("checkbox", { name: /complete/i })
      .first();
    await milestoneCheckbox.click();
    await expect(milestoneCheckbox).toBeChecked();
  });

  test("timeline and dashboard reflect the tracked work", async ({ page }) => {
    await logIn(page);
    await openProject(page);

    await openProjectTab(page, /timeline/i);
    await expect(page.getByText("First update", { exact: true })).toBeVisible();
    await expect(page.getByText(/milestone/i).first()).toBeVisible();

    // The dashboard card for the project is present
    await page.goto("/dashboard");
    await expect(
      page.getByRole("link", { name: new RegExp(projectName) }).first(),
    ).toBeVisible();
  });

  test("logs out and back in with the same credentials", async ({ page }) => {
    await logIn(page);
    await page.getByRole("button", { name: new RegExp(account.name, "i") }).click();
    await page.getByRole("menuitem", { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/(login)?$/);

    await logIn(page);
    await expect(page.getByRole("link", { name: new RegExp(projectName) }).first()).toBeVisible();
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
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
