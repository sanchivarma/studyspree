import { LocalRepository } from "./local";
import type { Repository } from "./types";
import { SupabaseRepository } from "./supabase";

// Phase 7 swaps this one line.
const local = new LocalRepository();
const remote = new SupabaseRepository();
// The server-rendered account boundary selects the authenticated repository.
// Development preview and /dev permanently retain the local implementation.
export const repo: Repository = new Proxy(local, { get(target,key) {
  const source = typeof document!=="undefined" && document.querySelector('[data-repository-mode="server"]') ? remote : target;
  const value:unknown=Reflect.get(source,key);
  return typeof value==="function" ? value.bind(source) : value;
} });
