"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { queryKeys } from "@/lib/queryKeys";
import { repo } from "@/lib/repo";
import type { Profile, WebcamCorner } from "@/types/domain";

export function useLocalCamera() {
  const profile = useProfile();
  const client = useQueryClient();
  const enabled = profile.data?.webcamEnabled ?? false;
  const corner = profile.data?.webcamCorner ?? "bottom-right";
  const stream = useRef<MediaStream | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const [isReady, setReady] = useState(false);
  const [isPending, setPending] = useState(false);
  const [permissionNote, setPermissionNote] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { mutate: save } = useMutation({
    scope: { id: "local-camera-preferences" },
    mutationFn: (patch: Partial<Pick<Profile, "webcamEnabled" | "webcamCorner">>) => repo.updateProfile(patch),
    onMutate: async patch => {
      await client.cancelQueries({ queryKey: queryKeys.profile() });
      const previous = client.getQueryData<Profile>(queryKeys.profile());
      if (previous) client.setQueryData(queryKeys.profile(), { ...previous, ...patch });
      return { previous, patch };
    },
    onError: (_error, _patch, context) => {
      const current = client.getQueryData<Profile>(queryKeys.profile());
      if (context?.previous && current && Object.entries(context.patch).every(([key, value]) => current[key as keyof Profile] === value)) {
        client.setQueryData(queryKeys.profile(), { ...current, webcamEnabled: context.previous.webcamEnabled, webcamCorner: context.previous.webcamCorner });
      }
    },
    onSettled: () => {
      if (client.isMutating({ predicate: mutation => mutation.options.scope?.id === "local-camera-preferences" }) === 1) {
        void client.invalidateQueries({ queryKey: queryKeys.profile() });
      }
    },
  });
  const detach = useCallback(() => {
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);
  const videoRef = useCallback((element: HTMLVideoElement | null) => {
    if (video.current) video.current.srcObject = null;
    video.current = element;
    if (element) element.srcObject = stream.current;
  }, []);

  useEffect(() => {
    const refreshPreference = (event: StorageEvent) => {
      if (event.key === null || event.key === "ss_profile") void client.invalidateQueries({ queryKey: queryKeys.profile() });
    };
    window.addEventListener("storage", refreshPreference);
    return () => window.removeEventListener("storage", refreshPreference);
  }, [client]);

  useEffect(() => {
    let cancelled = false;
    const removeListeners: (() => void)[] = [];
    setReady(false); setPermissionNote(false);
    if (!enabled) { detach(); setPending(false); return; }
    setPending(true);
    const open = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          save({ webcamEnabled: false }); return;
        }
        const acquired = await navigator.mediaDevices.getUserMedia({ video: { width: 320, facingMode: "user" }, audio: false });
        if (cancelled) { acquired.getTracks().forEach(track => track.stop()); return; }
        stream.current = acquired;
        if (video.current) video.current.srcObject = acquired;
        const onEnded = () => { detach(); setReady(false); };
        for (const track of acquired.getTracks()) {
          track.addEventListener("ended", onEnded);
          removeListeners.push(() => track.removeEventListener("ended", onEnded));
        }
        setReady(true);
      } catch (error) {
        if (cancelled) return;
        detach();
        const name = error instanceof Error ? error.name : "";
        if (name === "NotAllowedError") setPermissionNote(true);
        else if (name === "NotFoundError") save({ webcamEnabled: false });
        else console.warn("Local camera unavailable", name || "UnknownError");
      } finally { if (!cancelled) setPending(false); }
    };
    void open();
    return () => { cancelled = true; removeListeners.forEach(remove => remove()); detach(); };
  }, [enabled, attempt, detach, save]);

  // Stop immediately on user action, before the preference write completes.
  const disable = useCallback(() => {
    detach(); setReady(false); setPending(false); setPermissionNote(false);
    save({ webcamEnabled: false });
  }, [detach, save]);
  return {
    videoRef, isReady, isPending, permissionNote, corner,
    enable: () => { if (isPending) return; setPermissionNote(false); setAttempt(value => value + 1); save({ webcamEnabled: true }); },
    disable, dismissNote: () => setPermissionNote(false),
    moveTo: (webcamCorner: WebcamCorner) => save({ webcamCorner }),
  };
}
