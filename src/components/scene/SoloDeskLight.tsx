import { useId, type CSSProperties } from "react";
import type { SoloScenePreferences } from "@/lib/soloScenes/catalog";

type Candle = { x: number; wickY: number; width: number; height: number; period: number; delay: number };
// Wick positions use the same 1600 × 900 plane as the immutable desk artwork.
const candles: Partial<Record<SoloScenePreferences["desk"], Candle>> = {
  medieval: { x: 1472, wickY: 553, width: 8, height: 49, period: 1.37, delay: -0.4 },
  shakespearean: { x: 533, wickY: 522, width: 5, height: 43, period: 1.19, delay: -0.8 },
  pirate: { x: 201, wickY: 643, width: 7, height: 36, period: 1.53, delay: -0.2 },
};

/** Matches the desk artwork's 1600:900 alpha plane and bottom offset. */
export function SoloDeskLight({desk,animate}:{desk:SoloScenePreferences["desk"];animate:boolean}) {
  const glow = useId();
  const candle = candles[desk];
  if (!candle) return null;
  const { x, wickY, width, height } = candle;
  const flickerStyle = { "--candle-period": `${candle.period}s`, "--candle-delay": `${candle.delay}s` } as CSSProperties;
  return <svg data-testid="solo-desk-light" className="solo-desk-light" viewBox="0 0 1600 900">
    <defs><filter id={glow} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4"/></filter></defs>
    {desk==="shakespearean"&&<image href="/solo/motion/shakespeare-candle-v1.webp" x="480" y="475" width="110" height="195"/>}
    {animate && <g data-testid="desk-flame" transform={`translate(${x} ${wickY})`} style={flickerStyle}>
      <ellipse className="solo-desk-flame" cy={-height * 0.45} rx={width * 2.4} ry={height * 0.7} filter={`url(#${glow})`}/>
      <path data-testid="desk-flame-core" className="solo-desk-flame-core"
        d={`M0 0 C${-width} ${-height * 0.2} ${-width * 0.6} ${-height * 0.55} ${width * 0.2} ${-height} C${width * 0.6} ${-height * 0.7} ${width} ${-height * 0.25} 0 0Z`}/>
    </g>}
  </svg>;
}
