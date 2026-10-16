import { CommunityBoard } from "@/components/community/CommunityBoard";
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        group?: string;
    }>;
}) { const { group } = await searchParams; return <CommunityBoard area="schedule" groupId={group && /^[0-9a-f-]{36}$/.test(group) ? group : undefined}/>; }
