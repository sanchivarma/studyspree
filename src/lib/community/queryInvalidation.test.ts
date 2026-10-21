import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/queryKeys";
import { communityMutationFilters, communityMutationScope, invalidateCommunityMutation } from "./queryInvalidation";
import { areaSchema, type CommunityCommand } from "./schemas";

function populatedCache() {
  const cache = new QueryClient();
  for (const area of areaSchema.options) cache.setQueryData(queryKeys.community.read(area, {}), { area });
  cache.setQueryData(queryKeys.dashboard(), { activeRoomId: null });
  cache.setQueryData(queryKeys.profile(), { displayName: "reader" });
  return cache;
}

describe("community mutation refresh scope", () => {
  it("a task toggle does not reread rooms, chats, directories or the dashboard", async () => {
    const cache = populatedCache();
    const command: CommunityCommand = { action: "task.update", data: { id: "00000000-0000-4000-8000-000000000001", done: true } };
    await cache.invalidateQueries(communityMutationFilters(command));
    for (const area of areaSchema.options) expect(cache.getQueryState(queryKeys.community.read(area, {}))?.isInvalidated, area).toBe(area === "tasks");
    expect(cache.getQueryState(queryKeys.dashboard())?.isInvalidated).toBe(false);
    expect(cache.getQueryState(queryKeys.profile())?.isInvalidated).toBe(false);
    cache.clear();
  });

  it("chat messages refresh their log without cancelling presence or directory reads", () => {
    expect(communityMutationScope({ action: "room.chat.send", data: { id: "room", body: "hello", clientId: "message" } })).toEqual({ areas: ["roomChat"], dashboard: false });
  });

  it("room changes refresh public tiles and dashboard while retaining unrelated tasks", () => {
    const cache = populatedCache();
    invalidateCommunityMutation(cache, { action: "room.leave", data: { id: "room" } });
    expect(cache.getQueryState(queryKeys.community.read("publicSessions", {}))?.isInvalidated).toBe(true);
    expect(cache.getQueryState(queryKeys.community.read("roomParticipants", {}))?.isInvalidated).toBe(true);
    expect(cache.getQueryState(queryKeys.dashboard())?.isInvalidated).toBe(true);
    expect(cache.getQueryState(queryKeys.community.read("tasks", {}))?.isInvalidated).toBe(false);
    cache.clear();
  });

  it.each<CommunityCommand>([
    { action: "block.set", data: { targetId: "person", value: true } },
    { action: "preferences", data: { sharePresence: false } },
    { action: "group.leave", data: { id: "group" } },
    { action: "invite.accept", data: { token: "invitation" } },
  ])("refreshes every community view when $action can change access", command => {
    const cache = populatedCache();
    invalidateCommunityMutation(cache, command);
    for (const area of areaSchema.options) expect(cache.getQueryState(queryKeys.community.read(area, {}))?.isInvalidated, area).toBe(true);
    cache.clear();
  });
});
