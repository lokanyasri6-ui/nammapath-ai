import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // tiles are external; tests must not depend on them
  await page.route(/tile\.openstreetmap\.org/, (r) => r.abort());
});

test("homepage: hero, demo-data notice, language switch, skip link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Find footpaths");
  await expect(page.getByRole("note", { name: "Data notice" })).toContainText("SYNTHETIC");
  await expect(page.getByRole("link", { name: /Find an accessible route/ }).first()).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /Skip to main content/ })).toBeFocused();

  await page.getByRole("button", { name: "தமிழ்" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ta");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("நடைபாதைகளை");
});

test("route finder: wheelchair avoids the stairs-only footbridge and explains why", async ({ page }) => {
  await page.goto("/map");
  await page.getByLabel("Start").selectOption("bus_north");
  await page.getByLabel("Destination").selectOption("health_centre");
  await page.getByRole("radio", { name: /Wheelchair/ }).check({ force: true });
  await page.getByRole("button", { name: "Find routes" }).click();
  await expect(page.getByRole("heading", { name: /Route options/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Best match/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(/Avoids Footbridge over Main Road/)).toBeVisible();
  await page.getByRole("tab", { name: /Shortest route/ }).click();
  await expect(page.getByText("Conflicts with your profile")).toBeVisible();
});

test("route finder: explains when no step-free route exists", async ({ page }) => {
  await page.goto("/map?from=bus_north&to=market_upper&profile=wheelchair");
  await expect(page.getByText("No supported route found")).toBeVisible();
  await expect(page.getByText(/Market stairs/).first()).toBeVisible();
});

test("report form: accessible validation, demo AI suggestion, manual confirmation, submit", async ({ page }) => {
  await page.goto("/report");
  await page.getByRole("button", { name: "Submit report" }).click();
  const summary = page.getByRole("alert").filter({ hasText: "Please fix 3" });
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();

  await page.getByRole("button", { name: /Flooding/ }).click();
  await expect(page.getByText(/DEMO MODE — simulated prediction/)).toBeVisible();
  await expect(page.getByRole("radio", { name: /Waterlogging/ })).toBeChecked();

  const map = page.locator(".leaflet-container").first();
  await map.scrollIntoViewIfNeeded();
  const box = (await map.boundingBox())!;
  await map.click({ position: { x: box.width * 0.62, y: box.height * 0.55 } });
  await expect(page.getByText(/Location set:/)).toBeVisible();

  await page.getByRole("button", { name: "Submit report" }).click();
  await expect(page.getByText(/submitted as PENDING/)).toBeVisible();
});

test("community reports page lists reports with verification actions", async ({ page }) => {
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "How verification works" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Still there" }).first()).toBeVisible();
});

test("dashboard shows totals computed from data and labels the data source", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText(/Data source:/)).toBeVisible();
  await expect(page.getByText("Total reports")).toBeVisible();
  await page.getByRole("button", { name: "Show table" }).click();
  await expect(page.getByRole("columnheader", { name: "Week starting" })).toBeVisible();
});

test("layout has no horizontal scrolling", async ({ page }) => {
  for (const path of ["/", "/map", "/report", "/dashboard", "/reports", "/preferences"]) {
    await page.goto(path);
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  }
});

test("Tamil interface has no horizontal scrolling", async ({ page }) => {
  await page.goto("/map");
  await page.getByRole("button", { name: "தமிழ்" }).click();
  for (const path of ["/", "/map", "/report", "/dashboard"]) {
    await page.goto(path);
    await page.waitForTimeout(400);
    await expect(page.locator("html")).toHaveAttribute("lang", "ta");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${path} (Tamil)`).toBeLessThanOrEqual(1);
  }
});
