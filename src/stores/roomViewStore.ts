import { create } from "zustand";
type View={pinned:boolean;pins:{targetId:string;reason:string}[]};
type State={rooms:Record<string,View>;setView:(room:string,pinned:boolean)=>void;togglePin:(room:string,target:string)=>void;setReason:(room:string,target:string,reason:string)=>void};
const empty:View={pinned:false,pins:[]};
export const useRoomViewStore=create<State>(set=>({rooms:{},setView:(room,pinned)=>set(s=>({rooms:{...s.rooms,[room]:{...(s.rooms[room]??empty),pinned}}})),togglePin:(room,targetId)=>set(s=>{const current=s.rooms[room]??empty;return {rooms:{...s.rooms,[room]:{...current,pins:current.pins.some(p=>p.targetId===targetId)?current.pins.filter(p=>p.targetId!==targetId):[...current.pins,{targetId,reason:''}]}}};}),setReason:(room,targetId,reason)=>set(s=>{const current=s.rooms[room]??empty;return {rooms:{...s.rooms,[room]:{...current,pins:current.pins.map(p=>p.targetId===targetId?{...p,reason:reason.slice(0,200)}:p)}}};})}));
