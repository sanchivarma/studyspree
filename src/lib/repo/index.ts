import type { Repository } from "./types";
import { SupabaseRepository } from "./supabase";

const remote = new SupabaseRepository();
let local: Repository | undefined;
let localLoad: Promise<Repository> | undefined;
function loadLocal(): Promise<Repository> {
  localLoad ??= import("./local").then(({ LocalRepository }) => (local = new LocalRepository())).catch((error: unknown) => {
    localLoad = undefined;
    throw error;
  });
  return localLoad;
}
const isAccount = () => typeof document !== "undefined" && Boolean(document.querySelector('[data-repository-mode="server"]'));

// Real accounts do not download the offline history, seeding, and award engines.
// Preview methods load that implementation once. Close remains synchronous:
// an active preview session has already finished loading its repository.
export const repo: Repository = new Proxy(remote, {
  get(target, key, receiver) {
    const method: unknown = Reflect.get(target, key, receiver);
    if (typeof method !== "function") return method;
    if (key === "releaseSessionTab") return (id: string) => {
      if (isAccount()) target.releaseSessionTab(id);
      else local?.releaseSessionTab(id);
    };
    return (...args: unknown[]) => isAccount()
      ? Reflect.apply(method, target, args)
      : loadLocal().then(source => Reflect.apply(Reflect.get(source, key), source, args));
  },
});
