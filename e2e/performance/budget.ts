import { performance } from "node:perf_hooks";
import { expect, type TestInfo } from "@playwright/test";

export const TARGET_MS = 1000;
export const LIMIT_MS = 2000;
type TimedStep = (remaining: () => number) => Promise<unknown>;

/** One shared deadline includes Playwright actionability, navigation and data readiness. */
export async function expectFastAction(info: TestInfo, label: string, action: TimedStep, ready: TimedStep) {
  const start = performance.now();
  const remaining = () => Math.max(1, LIMIT_MS - (performance.now() - start));
  let completed = false;
  try {
    await action(remaining);
    await ready(remaining);
    completed = true;
  } finally {
    const elapsedMs = performance.now() - start;
    const sample = { label, elapsedMs: Math.round(elapsedMs), targetMs: TARGET_MS, limitMs: LIMIT_MS, completed };
    await info.attach(label, { body: JSON.stringify(sample), contentType: "application/json" });
    info.annotations.push({ type: elapsedMs <= TARGET_MS ? "performance-target" : "performance-over-target", description: `${label}: ${sample.elapsedMs} ms` });
    if (completed) expect(elapsedMs, `${label} must finish within ${LIMIT_MS} ms (target ${TARGET_MS} ms)`).toBeLessThanOrEqual(LIMIT_MS);
  }
}
