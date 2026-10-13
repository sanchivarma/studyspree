"use client";

import { useEffect, useState } from "react";

export function useIdleVisibility(delay = 5000) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let timeout: number | undefined;
    const clear = () => window.clearTimeout(timeout);
    const restore = () => {
      clear();
      if (document.hidden) return;
      setIsVisible(true);
      timeout = window.setTimeout(() => setIsVisible(false), delay);
    };
    const handleVisibility = () => { if (document.hidden) clear(); else restore(); };

    window.addEventListener("mousemove", restore, { passive: true });
    window.addEventListener("touchstart", restore, { passive: true });
    window.addEventListener("keydown", restore);
    window.addEventListener("focusin", restore);
    document.addEventListener("visibilitychange", handleVisibility);
    restore();

    return () => {
      clear();
      window.removeEventListener("mousemove", restore);
      window.removeEventListener("touchstart", restore);
      window.removeEventListener("keydown", restore);
      window.removeEventListener("focusin", restore);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [delay]);

  return isVisible;
}
