import type { SoloScenePreferences } from "@/lib/soloScenes/catalog";

/** Matches the desk artwork's 1600:900 alpha plane and bottom offset. */
export function SoloDeskLight({desk,animate}:{desk:SoloScenePreferences["desk"];animate:boolean}) {
  if(desk!=="pirate"&&desk!=="shakespearean")return null;
  return <svg data-testid="solo-desk-light" className="solo-desk-light" viewBox="0 0 1600 900">
    <defs><filter id="solo-desk-flame-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4"/></filter></defs>
    {desk==="shakespearean"&&<image href="/solo/motion/shakespeare-candle-v1.webp" x="480" y="475" width="110" height="195"/>}
    {animate&&(desk==="pirate"
      ?<ellipse data-testid="desk-flame" className="solo-desk-flame" cx="201" cy="621" rx="18" ry="22"/>
      :<ellipse data-testid="desk-flame" className="solo-desk-flame" cx="532" cy="495" rx="4" ry="16"/>)}
  </svg>;
}
