import { themes } from "./registry";
import { afterEach, expect, it, vi } from "vitest";
import { stat } from "node:fs/promises";
import { getSceneMediaManifest } from "./mediaManifest";

vi.mock("server-only", () => ({}));
vi.mock("node:fs/promises", () => ({ stat: vi.fn() }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

it("marks missing files absent without throwing", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.mocked(stat).mockRejectedValue(new Error("ENOENT"));
  const manifest = await getSceneMediaManifest();
  expect(Object.values(manifest).every((media) => !media.poster && !media.mp4 && !media.webm)).toBe(true);
});
it("uses the build snapshot in production without filesystem requests", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const manifest = { "rain-desk": { poster: true, webm: true, mp4: false }, "night-shift": { poster: false, webm: false, mp4: false }, "balcony-dusk": { poster: false, webm: false, mp4: false }, "dorm-bunk": { poster: false, webm: false, mp4: false } };
  Object.assign(manifest, Object.fromEntries(themes.filter(theme => !Object.hasOwn(manifest, theme.slug)).map(theme => [theme.slug, { poster: true, webm: true, mp4: true }])));
  vi.stubEnv("SCENE_MEDIA_MANIFEST", JSON.stringify(manifest));
  vi.mocked(stat).mockClear();
  expect(await getSceneMediaManifest()).toEqual(manifest);
  expect(stat).not.toHaveBeenCalled();
});
