import "server-only";
import { createHash } from "node:crypto";
import { authRepository } from "@/lib/repo/authRepository";
import { getDevAdminProfile } from "@/lib/auth/devAdmin";
import { createAuthClient } from "@/lib/auth/server";
import { now } from "@/lib/clock";
import { invitationConfiguration } from "./configuration";
import { invitationMessage } from "./message";
import { deliverInvitation } from "./delivery";
import type { InvitationRequest, InvitationErrorCode } from "./schemas";
export class InvitationServerError extends Error {
  constructor(public code: InvitationErrorCode, public status: number) { super(code); }
}
// Preview actors have no database identity. This development-only throttle is
// shared by username, so signing in afresh does not reset the hourly allowance.
const previewReservations = new Map<string, { id: string; time: number }[]>();
export async function sendInvitation(input: InvitationRequest) {
  const profile = await authRepository.getProfile();
  if (!profile) throw new InvitationServerError("unauthorized", 401);
  let config: ReturnType<typeof invitationConfiguration>;
  try { config = invitationConfiguration(); } catch { throw new InvitationServerError("notConfigured", 503); }
  const preview = await getDevAdminProfile();
  if (preview) {
    const timestamp = now().getTime();
    const recent = (previewReservations.get(preview.username) ?? []).filter(entry => entry.time > timestamp - 3600000);
    if (recent.some(entry => entry.id === input.requestId)) throw new InvitationServerError("duplicate", 409);
    if (recent.length >= 5) throw new InvitationServerError("rateLimited", 429);
    previewReservations.set(preview.username, [...recent, { id: input.requestId, time: timestamp }]);
  } else {
    const client = await createAuthClient();
    const response = await client.rpc("reserve_email_invitation", { p_id: input.requestId, p_recipient_hash: createHash("sha256").update(input.email).digest("hex") });
    if (response.error) throw new InvitationServerError(response.error.code === "P0001" ? "rateLimited" : "unavailable", response.error.code === "P0001" ? 429 : 503);
    if (!response.data) throw new InvitationServerError("duplicate", 409);
  }
  try {
    const delivery = await deliverInvitation(config, input.email, input.requestId, invitationMessage(profile.display_name || profile.username, input.locale, config.siteUrl));
    return { delivery };
  } catch { throw new InvitationServerError("unavailable", 503); }
}
