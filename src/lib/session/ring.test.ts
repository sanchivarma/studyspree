import { expect, it } from "vitest";
import { remainingOffset } from "./ring";

it.each([[0, 0], [150, 50], [300, 100], [600, 100], [-10, 0]])("depletes at %i elapsed seconds", (elapsed, offset) => {
  expect(remainingOffset(elapsed, 300, 100)).toBe(offset);
});
