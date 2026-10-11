import { test, expect } from "@playwright/test";

test("public landing page leads to dedicated login and signup screens", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Your business runs smoother/ })).toBeVisible();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in to OpsDesk" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await page.getByRole("button", { name: "Create an account" }).click();
  await expect(page.getByRole("heading", { name: "Create your workspace" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

async function createWorkspace(page) {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Alex Morgan");
  await page.getByLabel("Business name").fill("Evergreen Studio");
  await page.getByLabel("Email").fill(`alex-${Date.now()}-${Math.random()}@example.test`);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: /Create my workspace/ }).click();
}

test("redesigned workspace preserves every page and workflow entry point", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1766, height: 1000 });
  await createWorkspace(page);
  await expect(
    page.getByRole("heading", { name: "Your business, in motion." }),
  ).toBeVisible();
  const brand = page.getByRole("link", { name: "opsdesk", exact: true });
  await expect(brand).toHaveText("opsdesk");
  await expect(brand.locator("img")).toHaveAttribute(
    "src",
    "/brand/opsdesk-symbol.png",
  );
  await expect
    .poll(() =>
      brand
        .locator("img")
        .evaluate((image) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  await expect(
    page.getByText("Your team’s tasks", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Your AI team", { exact: true })).toBeVisible();
  await expect(page.getByText("Workspace owner", { exact: true })).toBeInViewport();
  await page
    .getByRole("textbox", { name: "Ask OpsDesk anything" })
    .fill("Review tomorrow’s staff coverage");
  await page
    .getByRole("button", { name: "Prepare an OpsDesk request" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Your request")).toHaveValue(
    "Review tomorrow’s staff coverage",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Handle staff absence", exact: true })
    .click();
  await expect(page.getByLabel("Your request")).toHaveValue(
    /Priya is unavailable/,
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  const views = [
    ["Customers", "Customer directory"],
    ["Schedule", "Appointments"],
    ["Team & tasks", "Senior stylist"],
    ["Conversations", "Customer message drafts"],
    ["Approvals", "Owner decisions"],
    ["Agent activity", "Workflow runs"],
    ["Settings", "Integration status"],
  ];
  for (const [name, content] of views) {
    await page
      .getByRole("navigation")
      .getByRole("button", { name, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(content, { exact: false }).first(),
    ).toBeVisible();
  }
  await page
    .getByRole("textbox", { name: "Search customers, bookings, and tasks" })
    .fill("Rahul");
  await page
    .getByRole("region", { name: "Search results" })
    .getByRole("button")
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Customers", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("table").getByText("Rahul Sharma")).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  await page.screenshot({
    path: ".local/overview-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("mobile layout keeps navigation and requests accessible without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createWorkspace(page);
  await expect(
    page.getByRole("heading", { name: "Your business, in motion." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await expect(
    page.getByText("Integration status", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Handle staff absence", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.screenshot({ path: ".local/overview-mobile.png", fullPage: true });
});
