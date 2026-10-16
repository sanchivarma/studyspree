import { CommunityBoard } from "@/components/community/CommunityBoard";
import { notFound } from "next/navigation";
import { z } from "zod";
export default async function Page({ params }: {
    params: Promise<{
        id: string;
    }>;
}) { const { id } = await params; if (!z.uuid().safeParse(id).success)
    notFound(); return <CommunityBoard area="feed" id={id}/>; }
