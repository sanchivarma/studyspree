import { PublicProfileScreen } from "@/components/profile/PublicProfileScreen";
import { serverProfileRepository } from "@/lib/profiles/serverRepository";
export default async function PersonPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const initialProfile = await serverProfileRepository.isLocal() ? null : await serverProfileRepository.getPublic(username);
  return <PublicProfileScreen username={username} initialProfile={initialProfile} />;
}
