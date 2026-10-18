import { test, expect } from "@playwright/test";

test("active GIFs read quietly first, then begin their actions at different times", async ({ page }) => {
  test.setTimeout(45000);
  await page.goto("/login");
  const slugs = ["realistic-01", "realistic-06", "medieval-scribe"];
  await page.evaluate(async slugs => {
    await Promise.all(slugs.map(async (slug, index) => {
      const image = document.createElement("img");
      image.id = `timing-${slug}`;
      image.style.cssText = `position:fixed;left:${index * 330}px;top:0;width:320px;height:240px;z-index:99999`;
      image.src = `/characters/${slug}/study-v11.gif?timing-regression`;
      document.body.append(image);
      await image.decode();
    }));
  }, slugs);
  const started = performance.now();
  const first = await Promise.all(slugs.map(slug => page.locator(`#timing-${slug}`).screenshot({ animations: "allow" })));
  await page.waitForTimeout(12000); // Observe the real browser GIF timeline, not a mocked clock.
  for (const [index, slug] of slugs.entries()) expect((await page.locator(`#timing-${slug}`).screenshot({ animations: "allow" })).equals(first[index]), `${slug} must still be reading`).toBe(true);
  const changed = new Map<string, number>();
  await expect.poll(async () => {
    for (const [index, slug] of slugs.entries()) {
      if (changed.has(slug)) continue;
      if (!(await page.locator(`#timing-${slug}`).screenshot({ animations: "allow" })).equals(first[index])) changed.set(slug, performance.now() - started);
    }
    return changed.size;
  }, { timeout: 13000, intervals: [150] }).toBe(slugs.length);
  for (const slug of slugs) {
    expect(changed.get(slug)!, slug).toBeGreaterThan(14000);
    expect(changed.get(slug)!, slug).toBeLessThan(21000);
  }
  expect(changed.get("realistic-06")! - changed.get("realistic-01")!).toBeGreaterThan(800);
  expect(changed.get("medieval-scribe")! - changed.get("realistic-06")!).toBeGreaterThan(1500);
});
