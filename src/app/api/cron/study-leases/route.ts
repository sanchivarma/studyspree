import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/types/database";
import { livekitService } from "@/lib/community/livekitServer";
export async function GET(request: Request) {
    const expected = process.env.CRON_SECRET;
    const supplied = request.headers.get("authorization") ?? "";
    const wanted = `Bearer ${expected ?? ""}`;
    if (!expected || Buffer.byteLength(supplied) !== Buffer.byteLength(wanted) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(wanted)))
        return Response.json({}, { status: 401 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
        return Response.json({}, { status: 503 });
    const admin = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await admin.rpc("maintain_study_leases");
    if (result.error)
        return Response.json({}, { status: 503 });
    const report=z.object({visits:z.array(z.object({roomId:z.uuid(),userId:z.uuid(),sharing:z.boolean()})),counts:z.record(z.string(),z.number()),errors:z.array(z.string())}).parse(result.data);
    const visits=report.visits;
    try {
        const media = livekitService();
        const rooms = await media.listRooms();
        for (const room of rooms.filter(room => /^studyspree-[a-f0-9-]{36}$/.test(room.name))) {
            const id = room.name.slice(11);
            const people = await media.listParticipants(room.name);
            for (const person of people) {
                const visit = visits.find(visit => visit.roomId === id && visit.userId === person.identity);
                if (!visit)
                    await media.removeParticipant(room.name, person.identity);
                else if (!visit.sharing && person.permission?.canPublish)
                    await media.updateParticipant(room.name, person.identity, undefined, { canPublish: false });
            }
        }
    }
    catch {
        return Response.json({ database: report.errors.length===0, media: false,counts:report.counts }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ database: report.errors.length===0, media: true,counts:report.counts }, {status:report.errors.length?503:200, headers: { "Cache-Control": "no-store" } });
}
