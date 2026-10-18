import { expect, it } from "vitest";
import { safeAuthReturnTo } from "./returnTo";
it("keeps shareable room and invitation destinations on this app", () => {
  expect(safeAuthReturnTo("/rooms/8a000000-0000-4000-8000-000000000001")).toBe("/rooms/8a000000-0000-4000-8000-000000000001");
  expect(safeAuthReturnTo("/invite/abcdefghijklmnopqrstuvwxyz012345")).toBe("/invite/abcdefghijklmnopqrstuvwxyz012345");
  expect(safeAuthReturnTo("/study?mode=characters")).toBe("/study?mode=characters");
});
it("rejects external, encoded, control-character and API destinations", () => {
  for (const input of ["//other.example/rooms", "https://other.example", "/\\other.example", "/%2f%2fother.example", "/api/profile/delete", "/rooms\n/abc", undefined]) expect(safeAuthReturnTo(input)).toBeNull();
});
