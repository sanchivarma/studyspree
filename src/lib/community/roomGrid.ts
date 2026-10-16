/** A pinned self tile always leads; other pins retain their original order. */
export function orderRoomPeople<T extends { person: { id: string } | null }>(people: T[], viewerId: string, pinnedIds: string[], pinnedOnly: boolean) {
  return people.filter(person => person.person && (!pinnedOnly || pinnedIds.includes(person.person.id)))
    .sort((a, b) => {
      const rank = (id: string) => pinnedIds.includes(id) ? id === viewerId ? 0 : 1 : 2;
      return rank(a.person!.id) - rank(b.person!.id);
    });
}
