export type PublicPerson = { id: string; displayName: string; avatarUrl: string | null };
export type RoomPreview = {
  id: string;
  name: string;
  description: string;
  humanCount: number;
  access: "public" | "members" | "invite";
  canJoin: boolean;
};
export type DashboardData = {
  activeRoomId?: string | null;
  latestRoom: RoomPreview | null;
  rooms: RoomPreview[];
  onlinePeople: PublicPerson[];
  capabilities: { humanRooms: boolean };
};
