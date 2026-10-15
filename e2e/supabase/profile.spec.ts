import { expect, test, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { createLocalAccount } from "./localAccount";

async function save(page: Page) {
  await Promise.all([
    page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/profile"),
    page.getByRole("button", { name: "Save profile", exact: true }).click(),
  ]);
  await expect(page.getByRole("form").getByRole("status")).toHaveText("Profile saved.");
}
test("real profiles, uploads and follows obey visibility across two accounts", async ({ page, browser }) => {
  test.setTimeout(180000);
  const viewerContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  try {
    await createLocalAccount(page, "Profile Owner");
    await page.goto("/profile");
    const form = page.getByRole("form", { name: "Edit profile" });
    await expect(form.getByLabel("Display name", { exact: true })).toHaveValue("Profile Owner");
    await expect(form.getByRole("checkbox")).not.toBeChecked();
    await form.getByLabel("About you", { exact: true }).fill("Physics and reading.");
    await form.getByLabel("Interests", { exact: true }).fill("Physics, Books");
    await save(page);
    await form.getByLabel("Profile photo", { exact: true }).setInputFiles(fileURLToPath(new URL("../../public/characters/female-01/poster-v1.webp", import.meta.url)));
    const photo = page.locator('article img[src^="/api/profile-media/"]');
    await expect(photo).toBeVisible();
    const photoUrl = await photo.getAttribute("src"); expect(photoUrl).toBeTruthy();
    const publicUrl = await page.getByRole("link", { name: "View my profile" }).getAttribute("href"); expect(publicUrl).toBeTruthy();
    await page.reload();
    await expect(form.getByLabel("About you", { exact: true })).toHaveValue("Physics and reading.");
    const viewer = await viewerContext.newPage();
    await createLocalAccount(viewer, "Profile Viewer");
    await viewer.goto(publicUrl!);
    await expect(viewer.getByTestId("public-profile").getByRole("status")).toHaveText("Profile unavailable.");
    expect((await viewer.request.get(photoUrl!)).status()).toBe(404);
    await form.getByRole("checkbox").check(); await save(page);
    await viewer.reload();
    await expect(viewer.getByText("Physics and reading.", { exact: true })).toBeVisible();
    expect((await viewer.request.get(photoUrl!)).status()).toBe(200);
    await viewer.getByRole("button", { name: "Follow", exact: true }).click();
    await expect(viewer.getByRole("button", { name: "Unfollow", exact: true })).toBeEnabled();
    await viewer.reload();
    await expect(viewer.getByRole("button", { name: "Unfollow", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(viewer.locator("dl div").filter({ hasText: "Followers" }).locator("dd")).toHaveText("1");
    await viewer.getByRole("button", { name: "Unfollow", exact: true }).click();
    await expect(viewer.getByRole("button", { name: "Follow", exact: true })).toBeEnabled();
    await form.getByRole("checkbox").uncheck(); await save(page);
    await viewer.reload();
    await expect(viewer.getByTestId("public-profile").getByRole("status")).toHaveText("Profile unavailable.");
    expect((await viewer.request.get(photoUrl!)).status()).toBe(404);
  } finally { await viewerContext.close(); }
});
