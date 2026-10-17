import {it,expect}from 'vitest';
import {scorePost}from './scoring';
it('scores trusted distinct counts monotonically and supports explicit weights',()=>{expect(scorePost({reactionCount:0})).toBe(0);expect(scorePost({reactionCount:4})).toBe(4);expect(scorePost({reactionCount:4},{reactionWeight:2})).toBe(8);expect(()=>scorePost({reactionCount:-1})).toThrow();});
