"use client";
import { useEffect } from "react";

export function useSessionTitle(time: string) {
  useEffect(() => {
    const original = document.title;
    return () => { document.title = original; };
  }, []);
  useEffect(() => { document.title = `${time} · StudySpree`; }, [time]);
}
