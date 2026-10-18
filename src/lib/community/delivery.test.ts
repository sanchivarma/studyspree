import { expect, it, vi } from "vitest";
import { nextDeliveryAttempt } from "./delivery";

it("retries an unacknowledged draft with the same request ID", () => {
  const create = vi.fn(() => "first"); const first = nextDeliveryAttempt(null, "draft", new Set(), create);
  expect(nextDeliveryAttempt(first, "draft", new Set(), create)).toBe(first);
  expect(create).toHaveBeenCalledOnce();
});
it("does not reuse an old retry ID for edited content or a later acknowledged submission", () => {
  const old = { clientId: "old", fingerprint: "same" }; const create = vi.fn(() => "new");
  expect(nextDeliveryAttempt(old, "edited", new Set(), create).clientId).toBe("new");
  expect(nextDeliveryAttempt(old, "same", new Set(["old"]), create).clientId).toBe("new");
});
