"use client";

import { useEffect, useRef } from "react";

export function RadioPlayer({ name, src }: { name: string; src: string }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const resize = () => {
      if (element.clientWidth > 0) element.style.setProperty("--radio-scale", String(element.clientWidth / 192));
    };
    resize(); const observer = new ResizeObserver(resize); observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // The official player hides its volume slider below a 640px iframe viewport.
  // Its right-hand control strip plus padding occupies 192px. Scale that strip
  // uniformly to fill the panel without distorting controls or reloading media.
  // The station name is already shown outside the cross-origin player.
  return <div ref={container} className="relative mt-3 aspect-[192/66] w-full overflow-hidden rounded-xl" data-testid="radio-player">
    <iframe title={name} src={src} width={640} height={100} allow="autoplay" referrerPolicy="no-referrer"
      style={{ transform: "scale(var(--radio-scale, 1))" }}
      className="absolute top-0 right-0 h-[100px] w-[640px] origin-top-right border-0" />
  </div>;
}
