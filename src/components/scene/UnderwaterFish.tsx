import { useId } from "react";

const fish = [
  {file:"silver-fish-v1",height:252,root:180,tailLeft:true,width:74},
  {file:"yellow-fish-v1",height:400,root:480,tailLeft:false,width:54},
  {file:"striped-fish-v1",height:295,root:180,tailLeft:true,width:62},
] as const;

/** Small distant visitors; each pass has a separate interval and an empty gap. */
export function UnderwaterFish() {
  const id=useId();
  return <svg data-testid="underwater-fish" className="solo-detail-layer" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
    {fish.map((entry,index)=>{
      const body=`${id}-body-${index}`,tail=`${id}-tail-${index}`;
      const source=`/solo/motion/${entry.file}.webp`;
      return <g key={entry.file} data-fish-pass={index} className={`solo-fish-pass solo-fish-pass-${index}`}>
        <svg width={entry.width} height={entry.width*entry.height/600} viewBox={`0 0 600 ${entry.height}`} overflow="visible">
          <defs>
            <clipPath id={body}><rect x={entry.tailLeft?entry.root-10:0} width={entry.tailLeft?610-entry.root:entry.root+20} height={entry.height}/></clipPath>
            <clipPath id={tail}><rect x={entry.tailLeft?0:entry.root-5} width={entry.tailLeft?entry.root+10:605-entry.root} height={entry.height}/></clipPath>
          </defs>
          <image href={source} width="600" height={entry.height} clipPath={`url(#${body})`}/>
          <g className="solo-fish-tail" style={{transformOrigin:`${entry.root}px ${entry.height/2}px`,animationDelay:`${index*-0.43}s`}}>
            <image href={source} width="600" height={entry.height} clipPath={`url(#${tail})`}/>
          </g>
        </svg>
      </g>;
    })}
  </svg>;
}
