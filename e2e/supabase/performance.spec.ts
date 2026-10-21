import { expect, test } from "@playwright/test";
import { createLocalAccount } from "./localAccount";

test("search stays responsive and sends the settled term once", async ({ page }) => {
  test.setTimeout(120_000);
  await createLocalAccount(page, "Search performance reader");
  const initial = page.waitForResponse(response => new URL(response.url()).pathname === "/api/community"
    && response.request().postDataJSON()?.area === "search");
  await page.getByRole("button", { name: "Search StudySpree", exact: true }).click();
  const input = page.getByRole("searchbox", { name: "Search", exact: true });
  await expect(input).toBeVisible();
  expect((await initial).ok()).toBe(true);
  const terms: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname !== "/api/community") return;
    const body = request.postDataJSON();
    if (body?.area === "search") terms.push(body.query.q ?? "");
  });
  const settled = page.waitForResponse(response => new URL(response.url()).pathname === "/api/community"
    && response.request().postDataJSON()?.query?.q === "quiet reading");
  await input.pressSequentially("quiet reading", { delay: 20 });
  await expect(input).toHaveValue("quiet reading");
  expect((await settled).ok()).toBe(true);
  expect(terms).toEqual(["quiet reading"]);
});

test("layout and Stats share one active-session polling interval", async ({ page }) => {
  test.setTimeout(120_000);
  await createLocalAccount(page, "Polling performance reader");
  await expect(page.getByTestId("default-study-room")).toBeVisible();
  // Offset the second consumer from the layout's interval. Independent polling
  // observers would otherwise appear deduplicated when mounted in one frame.
  await page.waitForTimeout(2000);
  await page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link", { name: "Stats", exact: true }).click();
  await expect(page.getByTestId("stats-total")).toBeVisible();
  let reads = 0;
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/repository" && request.postDataJSON()?.op === "active") reads++;
  });
  await page.waitForTimeout(11_000);
  expect(reads).toBeGreaterThanOrEqual(2);
  expect(reads).toBeLessThanOrEqual(3);
});
