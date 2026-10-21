import { afterEach, beforeEach, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ localLoaded: vi.fn(), remoteClose: vi.fn(), localClose: vi.fn() }));
vi.mock("./supabase", () => ({ SupabaseRepository: class {
  name = "account";
  getProfile() { return Promise.resolve(this.name); }
  releaseSessionTab(id: string) { calls.remoteClose(this.name, id); }
} }));
vi.mock("./local", () => {
  calls.localLoaded();
  return { LocalRepository: class {
    name = "preview";
    getProfile() { return Promise.resolve(this.name); }
    releaseSessionTab(id: string) { calls.localClose(this.name, id); }
  } };
});

beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllGlobals());

it("account calls never load offline storage engines, and tab close stays synchronous", async () => {
  vi.stubGlobal("document", { querySelector: () => ({}) });
  const { repo } = await import("./index");
  expect(await repo.getProfile()).toBe("account");
  expect(calls.localLoaded).not.toHaveBeenCalled();
  expect(repo.releaseSessionTab("active-session")).toBeUndefined();
  expect(calls.remoteClose).toHaveBeenCalledWith("account", "active-session");
});

it("preview calls retain one storage instance and close it before the unload handler returns", async () => {
  vi.stubGlobal("document", { querySelector: () => null });
  const { repo } = await import("./index");
  expect(await repo.getProfile()).toBe("preview");
  expect(await repo.getProfile()).toBe("preview");
  expect(repo.releaseSessionTab("active-session")).toBeUndefined();
  expect(calls.localClose).toHaveBeenCalledWith("preview", "active-session");
  expect(calls.remoteClose).not.toHaveBeenCalled();
});
