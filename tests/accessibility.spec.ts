import { expect, test, type Locator, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const project = {
  id: "project-1",
  name: "Accessible Project",
  description: "A project used for accessibility checks.",
  type: "software",
  status: "active",
  progressAuto: 42,
  progressManual: null,
  pointsTotal: 120,
  level: "Sprout",
  updatedAt: "2026-05-28T12:00:00.000Z",
};

const sharePayload = {
  project: {
    ...project,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  milestones: [],
  todos: [],
  journalEntries: [],
  timeline: [],
};

async function fulfillApi(route: Route) {
  const url = new URL(route.request().url());
  const method = route.request().method();

  if (url.pathname === "/api/auth/refresh") {
    await route.fulfill({ json: { accessToken: "test-token" } });
    return;
  }

  if (url.pathname === "/api/users/me") {
    await route.fulfill({
      json: {
        id: "user-1",
        email: "builder@example.com",
        name: "Builder",
        avatarUrl: null,
        aiProvider: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    return;
  }

  if (url.pathname === "/api/projects" && method === "POST") {
    await route.fulfill({
      json: {
        ...project,
        id: "keyboard-project",
        name: "Keyboard Launch",
        description: "Created without a mouse.",
      },
    });
    return;
  }

  if (url.pathname === "/api/projects") {
    await route.fulfill({ json: [project] });
    return;
  }

  if (url.pathname === "/api/projects/project-1") {
    await route.fulfill({ json: project });
    return;
  }

  if (url.pathname === "/api/projects/project-1/milestones") {
    await route.fulfill({ json: [] });
    return;
  }

  if (url.pathname === "/api/projects/project-1/todos") {
    await route.fulfill({ json: [] });
    return;
  }

  if (url.pathname === "/api/projects/project-1/timeline") {
    await route.fulfill({ json: { events: [], total: 0, page: 1, limit: 50 } });
    return;
  }

  if (url.pathname === "/api/projects/project-1/journal") {
    await route.fulfill({ json: { entries: [], total: 0, page: 1, limit: 3 } });
    return;
  }

  if (url.pathname === "/api/projects/project-1/parking-lot") {
    await route.fulfill({ json: { items: [] } });
    return;
  }

  if (url.pathname === "/api/projects/project-1/points-log") {
    await route.fulfill({ json: [] });
    return;
  }

  if (url.pathname === "/api/notifications") {
    await route.fulfill({ json: { notifications: [], unreadCount: 0 } });
    return;
  }

  if (url.pathname === "/api/share/public-token") {
    await route.fulfill({ json: sharePayload });
    return;
  }

  await route.fulfill({ status: 404, json: { error: "Not found" } });
}

async function runAxe(page: Page) {
  return new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
}

async function tabUntilFocused(page: Page, target: Locator, maxTabs = 30) {
  for (let index = 0; index < maxTabs; index += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) {
      return;
    }
    await page.keyboard.press("Tab");
  }

  await expect(target).toBeFocused();
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", fulfillApi);
});

test("main pages have no WCAG 2.1 AA axe violations", async ({ page }) => {
  const routes = [
    "/",
    "/login",
    "/register",
    "/dashboard",
    "/settings",
    "/projects/project-1?tab=overview",
    "/projects/project-1?tab=timeline",
    "/projects/project-1?tab=milestones",
    "/projects/project-1?tab=todos",
    "/projects/project-1?tab=journal",
    "/projects/project-1?tab=parking-lot",
    "/share/public-token",
  ];

  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const results = await runAxe(page);
    expect(results.violations, `${route} axe violations`).toEqual([]);
  }
});

test("create project flow is operable with only the keyboard", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  const newProjectButton = page.getByRole("button", { name: /new project/i });
  await tabUntilFocused(page, newProjectButton);
  await page.keyboard.press("Enter");

  await expect(page.getByRole("dialog", { name: /new project/i })).toBeVisible();

  const projectName = page.getByLabel(/project name/i);
  await tabUntilFocused(page, projectName);
  await page.keyboard.type("Keyboard Launch");

  const nextButton = page.getByRole("button", { name: /^next$/i });
  await tabUntilFocused(page, nextButton);
  await page.keyboard.press("Enter");

  const description = page.getByLabel(/vision/i);
  await tabUntilFocused(page, description);
  await page.keyboard.type("Created without a mouse.");

  await tabUntilFocused(page, nextButton);
  await page.keyboard.press("Enter");

  const createButton = page.getByRole("button", { name: /create project/i });
  await tabUntilFocused(page, createButton);

  const createRequest = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().endsWith("/api/projects"),
  );
  await page.keyboard.press("Enter");

  await createRequest;
  await expect(page).toHaveURL(/\/projects\/keyboard-project$/);
});
