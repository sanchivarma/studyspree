import { notFound } from "next/navigation";
import { InviteScreen } from "@/components/community/InviteScreen";
export default async function Page({ params }: {
    params: Promise<{
        token: string;
    }>;
}) { const { token } = await params; if (!/^[a-f0-9]{64}$/.test(token))
    notFound(); return <InviteScreen token={token}/>; }
