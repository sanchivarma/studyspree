import { ScenePlaceholder } from "@/components/scene/ScenePlaceholder";
import { mockProfile } from "@/lib/mock/profile";

export default function StartPage() {
  return <ScenePlaceholder slug={mockProfile.selectedCharacter} />;
}
