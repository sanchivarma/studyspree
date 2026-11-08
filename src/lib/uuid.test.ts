import { afterEach, expect, test, vi } from "vitest";
import { createUuid } from "./uuid";

afterEach(() => vi.unstubAllGlobals());

test("uses the native secure UUID when available", () => {
  const randomUUID = vi.fn(() => "12345678-1234-4234-8234-123456789abc");
  vi.stubGlobal("crypto", { randomUUID });
  expect(createUuid()).toBe("12345678-1234-4234-8234-123456789abc");
  expect(randomUUID).toHaveBeenCalledOnce();
});

test.each([0, 255])("sets UUID v4 version and variant with random bytes %i", value => {
  vi.stubGlobal("crypto", { getRandomValues: (bytes: Uint8Array) => bytes.fill(value) });
  expect(createUuid()).toMatch(value === 0
    ? /^00000000-0000-4000-8000-000000000000$/
    : /^ffffffff-ffff-4fff-bfff-ffffffffffff$/);
});

test("fallback uses independent cryptographic random bytes", () => {
  const getRandomValues = crypto.getRandomValues.bind(crypto);
  vi.stubGlobal("crypto", { getRandomValues });
  const values = Array.from({ length: 100 }, createUuid);
  expect(new Set(values).size).toBe(100);
  for (const value of values) expect(value).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
});
