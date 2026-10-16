"use client";

import { useEffect, useRef, useState } from "react";

export function useIdleVisibility(delay = 5000) {
  const [isVisible, setIsVisible] = useState(true);
  // Input handlers need the timeout's value even before React commits a render.
  const visibleRef = useRef(true);

  useEffect(() => {
    let timeout: number | undefined;
    const clear = () => window.clearTimeout(timeout);
    const restore = () => {
      clear();
      if (document.hidden) return;
      visibleRef.current = true;
      setIsVisible(true);
      timeout = window.setTimeout(() => {
        visibleRef.current = false;
        setIsVisible(false);
      }, delay);
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

  return { isVisible, visibleRef };
}
