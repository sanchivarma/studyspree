export type RoomParticipant={userId:string;displayName:string;avatarUrl:string|null;cameraPublished:boolean;status:string|null};
export type RoomViewState={view:'grid'|'pinned';pinnedTileIds:string[]};
export type StudyTile={kind:'person';participant:RoomParticipant}|{kind:'character';characterSlug:import('./characters').CharacterSlug};
