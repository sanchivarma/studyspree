/** Popularity uses distinct reactions at the page snapshot, then creation time and UUID. */
export const feedRanking={reactionWeight:1}as const;
export function scorePost(facts:{reactionCount:number},config:{reactionWeight:number}=feedRanking){
 if(!Number.isSafeInteger(facts.reactionCount)||facts.reactionCount<0||!Number.isFinite(config.reactionWeight)||config.reactionWeight<0)throw new Error('Invalid ranking facts');
 return facts.reactionCount*config.reactionWeight;
}
