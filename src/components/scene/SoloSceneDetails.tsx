import type { SoloScenePreferences } from "@/lib/soloScenes/catalog";
import { useId, type CSSProperties } from "react";
import { UnderwaterFish } from "./UnderwaterFish";

const academyWindows = [
  [415,372,5,17],[434,372,5,17],[452,372,5,17],[470,372,5,17],[489,372,5,17],
  [356,434,5,19],[380,434,5,22],[405,434,5,22],
  [446,271,5,19],[443,307,4,15],[365,272,5,11],[387,274,4,10],
  [412,240,4,13],[478,271,4,18],[344,272,4,12],[331,434,5,20],
] as const;
// Match complete painted fixtures, including the small lights between the
// terrace posts. Coordinates share the video's 1600 x 900 cover plane.
const academyPorchLights = [
  {id:"entrance",x:604,y:453,rx:3.5,ry:6},
  {id:"terrace-west-post",x:675,y:447,rx:7,ry:7},
  {id:"terrace-west-step",x:695,y:461,rx:3,ry:3.5},
  {id:"terrace-centre-post",x:728,y:454,rx:5,ry:5},
  {id:"terrace-wall",x:748,y:445,rx:4,ry:6},
  {id:"terrace-centre-step",x:771,y:460,rx:3.5,ry:4},
  {id:"terrace-east-post",x:803,y:442,rx:4,ry:6},
  {id:"terrace-east-rail",x:836,y:452,rx:3,ry:4},
  {id:"approach-upper",x:565,y:519,rx:2.5,ry:3.5},
  {id:"approach-west",x:287,y:560,rx:2.5,ry:3.5},
  {id:"approach-east",x:393,y:562,rx:2.5,ry:3.5},
] as const;

/** Object-sized layers share the video's cover geometry, never move the view. */
export function SoloSceneDetails({ view }: { view: SoloScenePreferences["window"] }) {
  const glow=useId();
  const sky=useId(), skyFade=useId(), softLight=useId();
  const porchGlow=useId(), porchFade=useId();
  if (view === "underwater") return <UnderwaterFish/>;
  if (view === "magic-academy") return <svg data-testid="academy-lights" className="solo-detail-layer solo-academy-lights" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
    <defs>
      <filter id={glow} x="-150%" y="-50%" width="400%" height="200%"><feGaussianBlur stdDeviation="2.3" result="halo"/><feMerge><feMergeNode in="halo"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id={softLight} x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="0.6"/></filter>
      <filter id={porchGlow} x="-150%" y="-100%" width="400%" height="300%">
        <feGaussianBlur stdDeviation="2.3" result="halo"/>
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.15" result="softCore"/>
        <feMerge><feMergeNode in="halo"/><feMergeNode in="softCore"/></feMerge>
      </filter>
      <radialGradient id={porchFade}>
        <stop offset="0" stopColor="rgb(75 34 10)"/>
        <stop offset="0.55" stopColor="rgb(75 34 10)" stopOpacity="0.85"/>
        <stop offset="1" stopColor="rgb(75 34 10)" stopOpacity="0"/>
      </radialGradient>
      <linearGradient id={skyFade} x1="0" y1="70" x2="0" y2="220" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="white"/><stop offset="1" stopColor="black"/>
      </linearGradient>
      {/* Keep drifting clouds above the fixed castle and mountain skyline. */}
      <mask id={sky} maskUnits="userSpaceOnUse" x="600" y="0" width="1000" height="220">
        <path d="M600 0H1600V190L1450 180L1340 185L1270 155L1220 170L1130 133L1075 150L1000 170L850 160L750 170L600 155Z" fill={`url(#${skyFade})`}/>
      </mask>
    </defs>
    <g mask={`url(#${sky})`}>
      <g data-testid="academy-clouds" className="solo-academy-clouds" opacity="0.65">
        <image href="/solo/motion/cloud-overlay-v1.webp" x="590" y="-90" width="1200" height="300"/>
        <image href="/solo/motion/cloud-overlay-v1.webp" x="1030" y="-40" width="850" height="230" opacity="0.7"/>
      </g>
    </g>
    {academyWindows.map(([x,y,width,height], index) => <g key={`${x}:${y}`}
      style={{"--light-delay":`${index*-2.3}s`,"--light-period":`${(8+index%4)*1.1}s`} as CSSProperties}>
      <rect x={x} y={y} width={width} height={height} rx="2" className="solo-academy-light-dimming" filter={`url(#${softLight})`}/>
      <rect x={x} y={y} width={width} height={height} rx="2" className="solo-candle-light" filter={`url(#${glow})`}/>
    </g>) }
    <g data-testid="academy-porch-lights">
      {academyPorchLights.map(({id,x,y,rx,ry},index)=><g key={id} data-light={id}
        style={{"--light-delay":`${index*-3.1}s`,"--light-period":`${(8.5+index%4)*1.1}s`} as CSSProperties}>
        <ellipse cx={x} cy={y} rx={rx} ry={ry} className="solo-academy-light-dimming" style={{fill:`url(#${porchFade})`}} filter={`url(#${softLight})`}/>
        <ellipse cx={x} cy={y} rx={rx*0.65} ry={ry*0.75} fillOpacity="0.9" className="solo-candle-light" filter={`url(#${porchGlow})`}/>
      </g>)}
    </g>
  </svg>;
  if (view === "sailing-ships") return <svg data-testid="sailing-ship-layers" className="solo-detail-layer" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
    <g className="solo-sailing-ship solo-sailing-ship-near"><image href="/solo/motion/ship-overlay-v3.webp" width="75" height="50"/></g>
    <g className="solo-sailing-ship solo-sailing-ship-far"><g transform="translate(60 0) scale(-1 1)"><image href="/solo/motion/ship-overlay-v3.webp" width="60" height="40"/></g></g>
  </svg>;
  return null;
}
