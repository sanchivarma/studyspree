import { afterEach, expect, it, vi } from "vitest";
import DevPage from "./page";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("@/components/stats/DevScreen", () => ({ DevScreen: () => null }));
vi.mock("@/app/(app)/layout", () => ({ default: () => null }));
afterEach(() => vi.unstubAllEnvs());
it("returns 404 outside development", () => {
  vi.stubEnv("NODE_ENV", "production"); expect(() => DevPage()).toThrow("NEXT_NOT_FOUND");
});
it("renders the development tools in development", () => {
  vi.stubEnv("NODE_ENV", "development"); expect(DevPage()).toBeTruthy();
});
