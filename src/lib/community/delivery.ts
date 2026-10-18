export type DeliveryAttempt = { clientId: string; fingerprint: string };

/** A retry keeps its ID; changed content or an acknowledged send starts a new intent. */
export function nextDeliveryAttempt(previous: DeliveryAttempt | null, fingerprint: string, deliveredIds: ReadonlySet<string>, createId: () => string): DeliveryAttempt {
  return previous && previous.fingerprint === fingerprint && !deliveredIds.has(previous.clientId)
    ? previous : { clientId: createId(), fingerprint };
}
