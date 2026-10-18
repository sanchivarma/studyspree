import { afterEach, expect, it, vi } from "vitest";
const read = vi.hoisted(() => vi.fn());
vi.mock("node:fs/promises", () => ({ readFile: read }));
import { GET } from "./route";
const context = (id: string) => ({ params: Promise.resolve({ id }) });
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

it("never serves local noncommercial files in production or off localhost", async () => {
  vi.stubEnv("NODE_ENV", "production");
  expect((await GET(new Request("http://localhost/api/local-audio/medieval-walk-v1.mp3"), context("medieval-walk-v1.mp3"))).status).toBe(404);
  vi.stubEnv("NODE_ENV", "development");
  expect((await GET(new Request("https://example.test/api/local-audio/medieval-walk-v1.mp3"), context("medieval-walk-v1.mp3"))).status).toBe(404);
  expect(read).not.toHaveBeenCalled();
});
it("serves exact local bytes without immutable caching and rejects arbitrary paths", async () => {
  vi.stubEnv("NODE_ENV", "development"); read.mockResolvedValue(Buffer.from([1, 2, 3]));
  const result = await GET(new Request("http://localhost/api/local-audio/medieval-walk-v1.mp3"), context("medieval-walk-v1.mp3"));
  expect(result.status).toBe(200); expect(result.headers.get("Cache-Control")).toBe("private, no-store");
  expect([...new Uint8Array(await result.arrayBuffer())]).toEqual([1, 2, 3]);
  read.mockClear();
  expect((await GET(new Request("http://localhost/api/local-audio/unknown"), context("../../.env.local"))).status).toBe(404);
  expect(read).not.toHaveBeenCalled();
});

it("does not serve retired chant recordings even when the old files remain on disk",async()=>{
 vi.stubEnv("NODE_ENV","development");
 for(const id of ["om-chant-389c4231.mp3","tibetan-chant-v1.mp3","buddhist-chant-v2.mp3"]){
 expect((await GET(new Request("http://localhost/api/local-audio/"+id),context(id))).status).toBe(404);
 }
 expect(read).not.toHaveBeenCalled();
});
