import type { SoloScenePreferences } from "@/lib/soloScenes/catalog";

/** Object-sized layers share the video's cover geometry, never move the view. */
export function SoloSceneDetails({ view }: { view: SoloScenePreferences["window"] }) {
  if (view === "magic-academy") return <svg data-testid="academy-lights" className="solo-detail-layer solo-academy-lights" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
    {[415, 434, 452, 470, 489].map((x, index) => <rect key={x} x={x} y="372" width="5" height="17" rx="2"
      className="solo-candle-light" style={{ animationDelay: `${index * -1.7}s`, animationDuration: `${5.2 + index * 0.7}s` }}/>) }
  </svg>;
  if (view === "sailing-ships") return <svg data-testid="sailing-ship-layers" className="solo-detail-layer" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
    <g className="solo-sailing-ship solo-sailing-ship-near"><image href="/solo/motion/ship-overlay-v3.webp" width="75" height="50"/></g>
    <g className="solo-sailing-ship solo-sailing-ship-far"><g transform="translate(60 0) scale(-1 1)"><image href="/solo/motion/ship-overlay-v3.webp" width="60" height="40"/></g></g>
  </svg>;
  return null;
}
