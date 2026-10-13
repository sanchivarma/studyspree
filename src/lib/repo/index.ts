import { LocalRepository } from "./local";
import type { Repository } from "./types";

// Phase 7 swaps this one line.
export const repo: Repository = new LocalRepository();
