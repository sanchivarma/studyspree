import "server-only";
import { cookies } from "next/headers";
import { authReturnCookie, safeAuthReturnTo } from "./returnTo";

export async function readAuthReturnTo(): Promise<string | null> {
  return safeAuthReturnTo((await cookies()).get(authReturnCookie)?.value);
}
export async function consumeAuthReturnTo(): Promise<string> {
  const store = await cookies(); const path = safeAuthReturnTo(store.get(authReturnCookie)?.value);
  store.delete(authReturnCookie); return path ?? "/";
}
export async function clearAuthReturnTo(): Promise<void> { (await cookies()).delete(authReturnCookie); }
