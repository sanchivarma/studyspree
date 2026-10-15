export const queryKeys = {
  dashboard: () => ["dashboard"] as const,
  profile: () => ["profile"] as const,
  activeSession: () => ["activeSession"] as const,
  stats: {
    all: () => ["stats"] as const,
    total: () => ["stats", "total"] as const,
    summary: () => ["stats", "summary"] as const,
    days: (from: string, to: string) => ["stats", "days", from, to] as const,
    sessions: (opts: { limit: number; offset: number }) => ["stats", "sessions", opts] as const,
    history: (pageSize: number) => ["stats", "history", pageSize] as const,
    completion: (id: string) => ["stats", "completion", id] as const,
  },
  streak: () => ["streak"] as const,
};
