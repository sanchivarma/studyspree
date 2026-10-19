import type { SoloScenePreferences } from "@/lib/soloScenes/catalog";
import { useId } from "react";
import { UnderwaterFish } from "./UnderwaterFish";

const academyWindows = [
  [415,372,5,17],[434,372,5,17],[452,372,5,17],[470,372,5,17],[489,372,5,17],
  [356,434,5,19],[380,434,5,22],[405,434,5,22],
  [446,271,5,19],[443,307,4,15],[365,272,5,11],[387,274,4,10],
  [412,240,4,13],[478,271,4,18],[344,272,4,12],[331,434,5,20],
] as const;
// Existing outdoor lantern centres: entrance terrace and lower approach.
const academyPorchLights = [[675,448],[687,448],[727,450],[749,446],[803,446],[565,519],[287,560],[393,562]] as const;

/** Object-sized layers share the video's cover geometry, never move the view. */
export function SoloSceneDetails({ view }: { view: SoloScenePreferences["window"] }) {
  const glow=useId();
  if (view === "underwater") return <UnderwaterFish/>;
  if (view === "magic-academy") return <svg data-testid="academy-lights" className="solo-detail-layer solo-academy-lights" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
    <defs><filter id={glow} x="-100%" y="-50%" width="300%" height="200%"><feGaussianBlur stdDeviation="1.7" result="halo"/><feMerge><feMergeNode in="halo"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    {academyWindows.map(([x,y,width,height], index) => <rect key={`${x}:${y}`} x={x} y={y} width={width} height={height} rx="2"
      className="solo-candle-light" filter={`url(#${glow})`} style={{ animationDelay: `${index * -2.3}s`, animationDuration: `${10 + index%5}s` }}/>) }
    <g data-testid="academy-porch-lights" fillOpacity="0.55" filter={`url(#${glow})`}>
      {academyPorchLights.map(([cx,cy],index)=><ellipse key={`${cx}:${cy}`} cx={cx} cy={cy} rx="1.5" ry="2.5"
        className="solo-candle-light" style={{animationDelay:`${index*-3.1}s`,animationDuration:`${11+index%4}s`}}/>)}
    </g>
  </svg>;
  if (view === "sailing-ships") return <svg data-testid="sailing-ship-layers" className="solo-detail-layer" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
    <g className="solo-sailing-ship solo-sailing-ship-near"><image href="/solo/motion/ship-overlay-v3.webp" width="75" height="50"/></g>
    <g className="solo-sailing-ship solo-sailing-ship-far"><g transform="translate(60 0) scale(-1 1)"><image href="/solo/motion/ship-overlay-v3.webp" width="60" height="40"/></g></g>
  </svg>;
  return null;
}
