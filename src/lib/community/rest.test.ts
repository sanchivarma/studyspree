import {it,expect} from 'vitest';
import {restCommand,restRead} from './rest';
const id='83000000-0000-4000-8000-000000000001';
it('maps REST names to validated commands without accepting extra identities or time',()=>{
 expect(restCommand('POST',['spaces'],{name:'Library',description:'Quiet',category:'deep-focus',visibility:'unlisted',capacity:4})).toMatchObject({action:'room.create',data:{title:'Library',category:'deep',visibility:'unlisted',private:true}});
 expect(()=>restCommand('POST',['spaces'],{name:'Library',category:'deep',capacity:4,userId:id})).toThrow();
 expect(()=>restCommand('PATCH',['tasks',id],{id:crypto.randomUUID(),title:'Read',date:'2026-10-17',position:1})).toThrow();
 expect(restCommand('POST',['scheduled-sessions'],{title:'Read',startsAt:'2026-10-18T10:00:00Z',endsAt:'2026-10-18T10:30:00Z',capacity:1,mode:'private-characters',characterSlugs:['male-01'],schedulingTimezone:'UTC'})).toMatchObject({action:'event.create',data:{minutes:30,timezone:'UTC'}});
});
it('includes cursor filters in reads and rejects invalid page sizes',()=>{
 expect(restRead(['rooms',id,'participants'],new URLSearchParams('limit=20'))).toEqual({area:'roomParticipants',query:{id,limit:20}});
 expect(()=>restRead(['spaces'],new URLSearchParams('limit=1000'))).toThrow();
});
