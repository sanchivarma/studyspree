import { notFound } from "next/navigation";
import { z } from "zod";
import { RoomScreen } from "@/components/community/RoomScreen";
export default async function Page({ params }: {
    params: Promise<{
        id: string;
    }>;
}) { const { id } = await params; if (!z.uuid().safeParse(id).success)
    notFound(); return <RoomScreen id={id}/>; }
