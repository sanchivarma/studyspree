import type { QueryClient, QueryFilters } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type { CommunityArea, CommunityCommand } from "./schemas";

type Scope = { areas: readonly CommunityArea[] | null; dashboard: boolean };

export function communityMutationScope(command: CommunityCommand): Scope {
  const action = command.action;
  if (action.startsWith("task.")) return { areas: ["tasks"], dashboard: false };
  if (action === "notification.read") return { areas: ["notifications"], dashboard: false };
  if (action === "feedback.create") return { areas: ["feedback"], dashboard: false };
  if (action === "report.create") return { areas: [], dashboard: false };
  if (action === "room.chat.send") return { areas: ["roomChat"], dashboard: false };
  if (action.startsWith("message.") || action.startsWith("thread.")) {
    return { areas: ["messages", "conversations", "recipients", "notifications"], dashboard: false };
  }
  if (action.startsWith("post.")) return { areas: ["feed", "groups"], dashboard: false };
  if (action.startsWith("buddy.")) return { areas: ["buddies", "search"], dashboard: false };
  if (action.startsWith("partner.")) return { areas: ["partners", "notifications"], dashboard: false };
  if (action.startsWith("contact.")) {
    return { areas: ["contacts", "calendar", "recipients", "notifications", "conversations"], dashboard: false };
  }
  if (action.startsWith("calendar.") || action.startsWith("event.")) {
    return { areas: ["calendar", "schedule", "spaces", "room", "publicSessions", "notifications"], dashboard: true };
  }
  if (action === "room.heartbeat") return { areas: ["room", "roomParticipants", "publicSessions"], dashboard: false };
  if (action.startsWith("room.") && action !== "room.accept" && action !== "room.invite.revoke") {
    return { areas: ["room", "roomParticipants", "roomChat", "spaces", "publicSessions", "partners", "plans", "invitations", "search"], dashboard: true };
  }
  if (action === "session.share") {
    return { areas: ["room", "roomParticipants", "spaces", "publicSessions", "invitations"], dashboard: true };
  }
  // Membership, consent, blocks, and invitation acceptance can change access to
  // several resources. Unknown future commands also take this conservative path.
  return { areas: null, dashboard: true };
}

export function communityMutationFilters(command: CommunityCommand): QueryFilters {
  const { areas } = communityMutationScope(command);
  return {
    queryKey: queryKeys.community.all(),
    predicate: query => areas === null || areas.includes(query.queryKey[1] as CommunityArea),
  };
}

export function invalidateCommunityMutation(cache: QueryClient, command: CommunityCommand): void {
  void cache.invalidateQueries(communityMutationFilters(command));
  if (communityMutationScope(command).dashboard) void cache.invalidateQueries({ queryKey: queryKeys.dashboard() });
}
