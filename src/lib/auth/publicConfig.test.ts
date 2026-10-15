import { expect, it } from "vitest";
import { parsePublicAuthConfig } from "./publicConfig";

it("supports offline preview and complete public configuration", () => {
  expect(parsePublicAuthConfig(undefined, undefined)).toBeNull();
  expect(parsePublicAuthConfig("http://127.0.0.1:54321", "sb_publishable_example")).toEqual({ url: "http://127.0.0.1:54321", key: "sb_publishable_example" });
});
it("rejects partial configuration, unsupported URL protocols, and secret keys", () => {
  expect(() => parsePublicAuthConfig("http://localhost:54321", undefined)).toThrow();
  expect(() => parsePublicAuthConfig("file:///tmp", "public")).toThrow();
  expect(() => parsePublicAuthConfig("https://example.supabase.co", "sb_secret_private")).toThrow();
  const jwt = `header.${btoa(JSON.stringify({ role: "service_role" }))}.signature`;
  expect(() => parsePublicAuthConfig("http://localhost:54321", jwt)).toThrow();
});
