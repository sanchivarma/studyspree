export const queryKeys = {
  profile: () => ["profile"] as const,
  activeSession: () => ["activeSession"] as const,
  stats: {
    all: () => ["stats"] as const,
    total: () => ["stats", "total"] as const,
    days: (from: string, to: string) => ["stats", "days", from, to] as const,
    sessions: (opts: { limit: number; offset: number }) => ["stats", "sessions", opts] as const,
    completion: (id: string) => ["stats", "completion", id] as const,
  },
  streak: () => ["streak"] as const,
};
