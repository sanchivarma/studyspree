import {afterEach,beforeEach,expect,it,vi} from "vitest";
const mock=vi.hoisted(()=>({execute:vi.fn()}));
vi.mock("@/lib/community/server",()=>({executeCommunity:mock.execute,CommunityServerError:class extends Error{constructor(public status:number){super();}}}));
import {POST} from "./route";
const id="80000000-0000-4000-8000-000000000001",user="80000000-0000-4000-8000-000000000002";
const request=(publish:boolean)=>new Request("http://localhost/api/rooms/token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,publish})});
beforeEach(()=>{mock.execute.mockReset();vi.stubEnv("LIVEKIT_URL","wss://example.livekit.cloud");vi.stubEnv("LIVEKIT_API_KEY","test-key");vi.stubEnv("LIVEKIT_API_SECRET","test-secret-not-a-real-credential");});
afterEach(()=>{vi.unstubAllEnvs();});
it("denies nonmembers and publishing without explicit sharing",async()=>{
 mock.execute.mockResolvedValue({viewerId:user,context:{joined:false,people:[]}});expect((await POST(request(false))).status).toBe(403);
 mock.execute.mockResolvedValue({viewerId:user,context:{joined:true,people:[{person:{id:user},sharing:false}]}});expect((await POST(request(true))).status).toBe(403);
});
it("issues room-bound, camera-only, five-minute grants",async()=>{
 mock.execute.mockResolvedValue({viewerId:user,context:{joined:true,people:[{person:{id:user},sharing:true}]}});
 const response=await POST(request(true));expect(response.status).toBe(200);const result=await response.json();
 const claims=JSON.parse(Buffer.from(result.token.split(".")[1],"base64url").toString());
 expect(claims.sub).toBe(user);expect(claims.video).toMatchObject({room:`studyspree-${id}`,roomJoin:true,canPublish:true,canPublishData:false,canPublishSources:["camera"]});expect(claims.exp-claims.nbf).toBeLessThanOrEqual(300);
 expect(response.headers.get("cache-control")).toContain("no-store");
});
it("rejects exhausted quotas without minting a token",async()=>{
 mock.execute.mockResolvedValue({viewerId:user,context:{joined:true,quota:{remainingSeconds:0},people:[]}});expect((await POST(request(false))).status).toBe(403);
});
