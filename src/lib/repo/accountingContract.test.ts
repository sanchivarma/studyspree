import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {LocalRepository} from "./local";
import {SupabaseRepository} from "./supabase";
import {repositoryRequestSchema} from "./remoteSchemas";
import type {Repository} from "./types";
vi.mock("@/lib/clock",()=>({now:()=>new Date(Date.now())}));
const input={plannedMinutes:25,themeSlug:"rain-desk",task:null};
// Shared accounting contract. HTTP uses a deterministic in-process backend;
// pgTAP and real-account browser tests separately exercise the Postgres RPCs.
function accountingContract(name:string,create:()=>Repository){
 describe(name,()=>{
  let repo:Repository;
  beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));repo=create();});
  afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
  it("reuses a concurrent start and recovers it by ID",async()=>{
   const [first,second]=await Promise.all([repo.startSession(input),repo.startSession(input)]);
   expect(first).toEqual(second);expect(await repo.getActiveSession()).toEqual(first);expect(await repo.getSession(first.id)).toEqual(first);
  });
  it("banks timestamp seconds once and preserves totals across repeat Finish",async()=>{
   const session=await repo.startSession(input);vi.advanceTimersByTime(10999);
   const first=await repo.endSession(session.id,"stopped_early");expect(first.session.actualSeconds).toBe(10);
   vi.advanceTimersByTime(50000);expect(await repo.endSession(session.id,"completed")).toEqual(first);expect(await repo.getTotalSecondsAllTime()).toBe(10);
  });
  it("caps long sessions and conserves day totals",async()=>{
   const session=await repo.startSession(input);vi.advanceTimersByTime(10*3600000);const ended=await repo.endSession(session.id,"completed");
   expect(ended.session.actualSeconds).toBe(21600);const days=await repo.getDayStats("2026-01-01","2026-12-31");expect(days.reduce((sum,day)=>sum+day.totalSeconds,0)).toBe(await repo.getTotalSecondsAllTime());
  });
 });
}
accountingContract("Local accounting",()=>new LocalRepository(()=>null));
accountingContract("HTTP accounting",()=>{
 const backend=new LocalRepository(()=>null);
 vi.stubGlobal("fetch",async(_url:string,options:RequestInit)=>{
  const request=repositoryRequestSchema.parse(JSON.parse(String(options.body)));let value:unknown;
  switch(request.op){
   case "start":value=await backend.startSession(request.input);break;
   case "finish":value=await backend.endSession(request.id,request.reason);break;
   case "active":value=await backend.getActiveSession();break;
   case "session":value=await backend.getSession(request.id);break;
   case "days":value=await backend.getDayStats(request.from,request.to);break;
   case "total":value=await backend.getTotalSecondsAllTime();break;
   default:throw new Error("Unexpected operation");
  }
  return Response.json(value);
 });
 return new SupabaseRepository();
});
