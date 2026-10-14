"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { queryKeys } from "@/lib/queryKeys";
import type { WebcamCorner } from "@/types/domain";

export function useLocalCamera({ preview = true }: { preview?: boolean } = {}) {
  const profile = useProfile();
  const client = useQueryClient();
  const enabled = preview && (profile.data?.webcamEnabled ?? false);
  const corner = profile.data?.webcamCorner ?? "bottom-right";
  const stream = useRef<MediaStream | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const [isReady, setReady] = useState(false);
  const [isPending, setPending] = useState(false);
  const [permissionNote, setPermissionNote] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { mutate: save } = useUpdateProfile();
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // Settings verifies permission in context, then releases the camera. The live
  // preview still has a single owner, and late permission responses are stopped.
  const requestPermission = useCallback(async () => {
    setPermissionNote(false);
    let acquired: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new DOMException("No camera", "NotFoundError");
      acquired = await navigator.mediaDevices.getUserMedia({ video: { width: 320, facingMode: "user" }, audio: false });
      if (!mounted.current) throw new DOMException("Consumer unmounted", "AbortError");
    } catch (error) {
      if (mounted.current && error instanceof Error && error.name === "NotAllowedError") setPermissionNote(true);
      else if (mounted.current && error instanceof Error && !["NotFoundError", "AbortError"].includes(error.name)) console.warn("Local camera unavailable", error.name);
      throw error;
    } finally { acquired?.getTracks().forEach(track => track.stop()); }
  }, []);
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
    videoRef, isReady, isPending, permissionNote, corner, requestPermission,
    enable: () => { if (isPending) return; setPermissionNote(false); setAttempt(value => value + 1); save({ webcamEnabled: true }); },
    disable, dismissNote: () => setPermissionNote(false),
    moveTo: (webcamCorner: WebcamCorner) => save({ webcamCorner }),
  };
}
