import { shiftDate } from "@/lib/stats/dates";
import { toLocalDate } from "@/lib/stats/localDate";
export type PresenceInterval = {
    roomId: string;
    userId: string;
    startedAt: string;
    endedAt: string;
};
/** Union intersections before adding seconds: repeat visits cannot double-credit. */
export function partnerOverlaps(visits: readonly PresenceInterval[], viewerId: string, timezone: string) {
    const own = visits.filter(v => v.userId === viewerId);
    const partners = new Map<string, [
        number,
        number
    ][]>();
    for (const a of own)
        for (const b of visits) {
            if (b.userId === viewerId || b.roomId !== a.roomId)
                continue;
            const start = Math.max(Date.parse(a.startedAt), Date.parse(b.startedAt));
            const end = Math.min(Date.parse(a.endedAt), Date.parse(b.endedAt));
            if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
                const list = partners.get(b.userId) ?? [];
                list.push([start, end]);
                partners.set(b.userId, list);
            }
        }
    return [...partners].map(([partnerId, spans]) => {
        const merged: [
            number,
            number
        ][] = [];
        for (const span of spans.sort((a, b) => a[0] - b[0])) {
            const last = merged.at(-1);
            if (last && span[0] <= last[1])
                last[1] = Math.max(last[1], span[1]);
            else
                merged.push([...span]);
        }
        const dates = new Set<string>();
        for (const [start, end] of merged) {
            const last = toLocalDate(new Date(end - 1), timezone);
            for (let day = toLocalDate(new Date(start), timezone); day <= last; day = shiftDate(day, 1))
                dates.add(day);
        }
        return { partnerId, totalSeconds: Math.floor(merged.reduce((sum, [start, end]) => sum + end - start, 0) / 1000), days: dates.size };
    });
}
