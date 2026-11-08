import { expect, test } from "vitest";
import { hasSameOrigin } from "./sameOrigin";

test.each([
  [{}, true],
  [{ origin: "http://localhost:3000" }, true],
  [{ host: "192.168.178.30:3000", origin: "http://192.168.178.30:3000" }, true],
  [{ host: "192.168.178.30:3000", origin: "http://evil.test" }, false],
  [{ host: "192.168.178.30:3000", origin: "https://192.168.178.30:3000" }, false],
  [{ host: "localhost:3000", origin: "http://evil.test", "x-forwarded-host": "evil.test" }, false],
  [{ host: "localhost:3000/evil", origin: "http://localhost:3000" }, false],
  [{ origin: "null" }, false],
] as const)("validates browser origin against the actual request host: %j", (headers, expected) => {
  expect(hasSameOrigin(new Request("http://localhost:3000/api/community", { headers }))).toBe(expected);
});
