import { SpacesSheet } from "@/components/spaces/SpacesSheet";
import { CommunityBoard } from "@/components/community/CommunityBoard";
export default function Page() { return <><div className="absolute top-4 left-20 z-20"><SpacesSheet/></div><CommunityBoard area="spaces"/></>; }
