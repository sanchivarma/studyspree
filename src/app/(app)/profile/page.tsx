import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { serverProfileRepository } from "@/lib/profiles/serverRepository";
export default async function ProfilePage() {
  const isLocal = await serverProfileRepository.isLocal();
  const initialProfile = isLocal ? undefined : await serverProfileRepository.getOwn();
  return <ProfileScreen initialProfile={initialProfile} isLocal={isLocal} />;
}
