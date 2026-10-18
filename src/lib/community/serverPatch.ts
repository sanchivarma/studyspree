import "server-only";
import { z } from "zod";
import { createAuthClient } from "@/lib/auth/server";
import { getDevAdminProfile } from "@/lib/auth/devAdmin";
import { CommunityServerError } from "./server";
import { parseResourcePatch, type PatchResource } from "./patches";
import { mutationResultSchema } from "./schemas";

export async function executeResourcePatch(resource: PatchResource, id: string, input: unknown) {
  let patch;
  try { patch = parseResourcePatch(resource, input); z.uuid().parse(id); }
  catch { throw new CommunityServerError(400, "invalid"); }
  if (await getDevAdminProfile()) throw new CommunityServerError(401, "accountRequired");
  const client = await createAuthClient();
  const identity = await client.auth.getUser();
  if (identity.error || !identity.data.user) throw new CommunityServerError(401, "accountRequired");
  const result = await client.rpc("community_patch", { p_resource: resource, p_id: id, p_patch: patch });
  if (result.error) throw new CommunityServerError(result.error.code === "42501" ? 403 : 400, result.error.code === "42501" ? "forbidden" : "invalid");
  return mutationResultSchema.parse(result.data);
}
