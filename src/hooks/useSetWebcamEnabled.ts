"use client";

import { useProfileMutation } from "@/hooks/useProfileMutation";
import { useLocalCamera } from "@/hooks/useLocalCamera";

export function useSetWebcamEnabled() {
  const camera = useLocalCamera({ preview: false });
  const mutation = useProfileMutation((webcamEnabled: boolean) => ({ webcamEnabled }), async enabled => {
    if (enabled) await camera.requestPermission();
  });
  return { ...mutation, permissionNote: camera.permissionNote, dismissNote: camera.dismissNote };
}
